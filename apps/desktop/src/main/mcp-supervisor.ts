import { spawn, ChildProcess } from "child_process";
import * as net from "net";
import * as http from "http";
import * as path from "path";
import * as fs from "fs";
import { EventEmitter } from "events";
import { ServerStatus } from "../types/ipc";

export interface SupervisorOptions {
  defaultPort?: number;
  maxPort?: number;
  host?: string;
}

export class McpSupervisor extends EventEmitter {
  private child: ChildProcess | null = null;
  private currentPort = 3333;
  private isManaged = false;
  private isRunning = false;
  private logs: string[] = [];
  private sseRequest: http.ClientRequest | null = null;
  private sseReconnectTimer: NodeJS.Timeout | null = null;
  private readonly defaultPort: number;
  private readonly maxPort: number;
  private readonly host: string;

  constructor(options: SupervisorOptions = {}) {
    super();
    this.defaultPort = options.defaultPort || 3333;
    this.maxPort = options.maxPort || 3340;
    this.host = options.host || "127.0.0.1";
    this.currentPort = this.defaultPort;
  }

  public async startOrConnect(): Promise<ServerStatus> {
    this.addLog(
      `[Supervisor] Scanning ports ${this.defaultPort}..${this.maxPort} for active Pointr MCP server...`
    );

    // 1. Check if Pointr server is already running on any port in range
    for (let port = this.defaultPort; port <= this.maxPort; port++) {
      const isHealthy = await this.verifyHealth(port);
      if (isHealthy) {
        this.currentPort = port;
        this.isManaged = false;
        this.isRunning = true;
        this.addLog(
          `[Supervisor] Connected to external Pointr MCP server on port ${port}`
        );
        this.connectToSSE(port);
        const status = this.getStatus();
        this.emit("status-change", status);
        return status;
      }
    }

    // 2. Find first free port to spawn our own managed server
    let targetPort = this.defaultPort;
    for (let port = this.defaultPort; port <= this.maxPort; port++) {
      const inUse = await this.checkPortInUse(port);
      if (!inUse) {
        targetPort = port;
        break;
      }
    }

    this.currentPort = targetPort;
    return this.spawnServer(targetPort);
  }

  public async spawnServer(port: number): Promise<ServerStatus> {
    this.stop(); // Stop any existing child/connections

    const cliPath = this.resolveCliPath();
    this.addLog(
      `[Supervisor] Spawning managed MCP server on port ${port} (entry: ${cliPath})`
    );

    try {
      this.child = spawn(process.execPath, [cliPath, "--port", String(port)], {
        env: {
          ...process.env,
          NODE_ENV: "development",
          PORT: String(port),
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.isManaged = true;
      this.isRunning = true;

      this.child.stdout?.on("data", (data: Buffer) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            this.addLog(trimmed);
            this.emit("log", trimmed);
          }
        }
      });

      this.child.stderr?.on("data", (data: Buffer) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            const formatted = `[ERROR] ${trimmed}`;
            this.addLog(formatted);
            this.emit("log", formatted);
          }
        }
      });

      this.child.on("error", (err: Error) => {
        this.addLog(`[Supervisor] Process error: ${err.message}`);
        this.isRunning = false;
        this.emit("status-change", this.getStatus());
      });

      this.child.on("exit", (code: number | null, signal: string | null) => {
        this.addLog(
          `[Supervisor] MCP Server process exited (code=${code}, signal=${signal})`
        );
        this.child = null;
        this.isRunning = false;
        this.emit("status-change", this.getStatus());
      });

      // Poll healthcheck until server is ready (up to 3 seconds)
      const ready = await this.waitForHealth(port, 15, 200);
      if (ready) {
        this.addLog(
          `[Supervisor] Managed MCP Server is ready & healthy on port ${port}`
        );
        this.connectToSSE(port);
      } else {
        this.addLog(
          `[Supervisor] Warning: MCP Server spawned on port ${port} but healthcheck timed out`
        );
      }

      const status = this.getStatus();
      this.emit("status-change", status);
      return status;
    } catch (err: any) {
      this.isRunning = false;
      this.isManaged = false;
      this.addLog(`[Supervisor] Failed to spawn MCP Server: ${err.message}`);
      const status = { ...this.getStatus(), error: err.message };
      this.emit("status-change", status);
      return status;
    }
  }

  public async restart(): Promise<ServerStatus> {
    this.addLog(`[Supervisor] Restarting MCP Server...`);
    this.stop();
    return this.startOrConnect();
  }

  public stop(): void {
    if (this.sseReconnectTimer) {
      clearTimeout(this.sseReconnectTimer);
      this.sseReconnectTimer = null;
    }

    if (this.sseRequest) {
      this.sseRequest.destroy();
      this.sseRequest = null;
    }

    if (this.child) {
      this.addLog(
        `[Supervisor] Terminating managed child process (PID: ${this.child.pid})`
      );
      try {
        this.child.kill("SIGTERM");
      } catch {}
      this.child = null;
    }

    this.isRunning = false;
    this.isManaged = false;
    this.emit("status-change", this.getStatus());
  }

  public getStatus(): ServerStatus {
    return {
      running: this.isRunning,
      managed: this.isManaged,
      port: this.currentPort,
      pid: this.child?.pid,
      payloadCount: 0,
    };
  }

  public getLogs(): string[] {
    return [...this.logs];
  }

  public async getLatest(): Promise<any | null> {
    try {
      const response = await this.httpGetJson(
        `http://${this.host}:${this.currentPort}/context/latest`
      );
      return response;
    } catch {
      return null;
    }
  }

  public async getHistory(): Promise<any[]> {
    try {
      const response = await this.httpGetJson(
        `http://${this.host}:${this.currentPort}/context/history`
      );
      return Array.isArray(response) ? response : [];
    } catch {
      return [];
    }
  }

  public connectToSSE(port: number): void {
    if (this.sseRequest) {
      this.sseRequest.destroy();
      this.sseRequest = null;
    }

    const endpoint = `http://${this.host}:${port}/events`;
    this.addLog(`[Supervisor] Connecting to SSE stream at ${endpoint}...`);

    try {
      const req = http.get(endpoint, (res) => {
        if (res.statusCode !== 200) {
          this.addLog(
            `[Supervisor] SSE stream returned status ${res.statusCode}`
          );
          this.scheduleSseReconnect(port);
          return;
        }

        this.addLog(`[Supervisor] Connected to SSE event hub (: ${port})`);
        let buffer = "";

        res.on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          const messages = buffer.split("\n\n");
          buffer = messages.pop() || "";

          for (const msg of messages) {
            if (!msg.trim()) continue;
            this.parseSseMessage(msg);
          }
        });

        res.on("end", () => {
          this.addLog(`[Supervisor] SSE stream closed by server`);
          this.scheduleSseReconnect(port);
        });

        res.on("error", (err: Error) => {
          this.addLog(`[Supervisor] SSE stream error: ${err.message}`);
          this.scheduleSseReconnect(port);
        });
      });

      req.on("error", (err: Error) => {
        this.addLog(`[Supervisor] SSE request error: ${err.message}`);
        this.scheduleSseReconnect(port);
      });

      this.sseRequest = req;
    } catch (err: any) {
      this.addLog(`[Supervisor] Failed to initiate SSE: ${err.message}`);
      this.scheduleSseReconnect(port);
    }
  }

  public parseSseMessage(raw: string): void {
    const lines = raw.split("\n");
    let eventName = "message";
    let dataStr = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataStr = line.slice(5).trim();
      }
    }

    if (dataStr) {
      let parsedData: any = dataStr;
      try {
        parsedData = JSON.parse(dataStr);
      } catch {}

      if (eventName === "target-captured") {
        this.addLog(
          `[Supervisor] Target Captured: <${
            parsedData?.dom?.tagName ||
            parsedData?.nativeNode?.componentName ||
            "element"
          }>`
        );
        this.emit("target-captured", parsedData);
      } else if (eventName === "server-status") {
        this.emit("server-status", parsedData);
      } else {
        this.emit(eventName, parsedData);
      }
    }
  }

  private scheduleSseReconnect(port: number): void {
    if (this.sseReconnectTimer || !this.isRunning) return;
    this.sseReconnectTimer = setTimeout(() => {
      this.sseReconnectTimer = null;
      if (this.isRunning) {
        this.connectToSSE(port);
      }
    }, 2000);
  }

  public checkPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(300);

      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });

      socket.once("error", () => {
        socket.destroy();
        resolve(false);
      });

      socket.once("timeout", () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, this.host);
    });
  }

  public verifyHealth(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        {
          host: this.host,
          port,
          path: "/health",
          timeout: 400,
        },
        (res) => {
          if (res.statusCode !== 200) {
            resolve(false);
            return;
          }
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              resolve(json.status === "ok");
            } catch {
              resolve(false);
            }
          });
        }
      );

      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  private async waitForHealth(
    port: number,
    maxAttempts: number,
    intervalMs: number
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      const healthy = await this.verifyHealth(port);
      if (healthy) return true;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return false;
  }

  private addLog(msg: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const entry = `[${timestamp}] ${msg}`;
    this.logs.push(entry);
    if (this.logs.length > 500) {
      this.logs.shift();
    }
  }

  private resolveCliPath(): string {
    // Attempt multiple path resolution strategies
    const candidates = [
      // 1. Monorepo sibling package dist
      path.resolve(__dirname, "../../../../packages/mcp-server/dist/cli.js"),
      path.resolve(__dirname, "../../../packages/mcp-server/dist/cli.js"),
      path.resolve(process.cwd(), "packages/mcp-server/dist/cli.js"),
      path.resolve(process.cwd(), "../packages/mcp-server/dist/cli.js"),
      // 2. Node modules resolution
      path.resolve(
        __dirname,
        "../../node_modules/@pointr/mcp-server/dist/cli.js"
      ),
      path.resolve(
        process.cwd(),
        "node_modules/@pointr/mcp-server/dist/cli.js"
      ),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    try {
      return require.resolve("@pointr/mcp-server/dist/cli.js");
    } catch {
      // Fallback default
      return candidates[0]!;
    }
  }

  private httpGetJson(urlStr: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = http.get(urlStr, { timeout: 1500 }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timed out"));
      });
    });
  }
}
