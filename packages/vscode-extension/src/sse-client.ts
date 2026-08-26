import http from "http";
import { ConnectionStatus, PointrPayload } from "./types";

export interface SSEClientOptions {
  initialPort?: number;
  minPort?: number;
  maxPort?: number;
  pollIntervalMs?: number;
  reconnectDelayMs?: number;
}

export type StatusChangeCallback = (
  status: ConnectionStatus,
  port?: number
) => void;
export type TargetCapturedCallback = (payload: PointrPayload) => void;
export type ErrorCallback = (error: Error) => void;

/**
 * Checks if a Pointr server is running on the given host and port.
 */
export async function checkServerHealth(
  port: number,
  host: string = "127.0.0.1",
  timeoutMs: number = 600
): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: host,
        port,
        path: "/health",
        method: "GET",
        timeout: timeoutMs,
      },
      (res) => {
        if (res.statusCode === 200) {
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
        } else {
          resolve(false);
        }
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });

    req.on("error", () => {
      resolve(false);
    });

    req.end();
  });
}

/**
 * Scans ports starting from `preferredPort` and then `minPort`..`maxPort` for an active Pointr server.
 */
export async function discoverPointrPort(
  preferredPort: number = 3333,
  minPort: number = 3333,
  maxPort: number = 3340,
  host: string = "127.0.0.1"
): Promise<number | null> {
  // Try preferred port first
  if (await checkServerHealth(preferredPort, host)) {
    return preferredPort;
  }

  // Scan port range
  for (let port = minPort; port <= maxPort; port++) {
    if (port === preferredPort) continue;
    if (await checkServerHealth(port, host)) {
      return port;
    }
  }

  return null;
}

/**
 * Computes a simple fingerprint to deduplicate incoming payloads.
 */
export function getPayloadFingerprint(payload: PointrPayload): string {
  const file = payload.source?.file || "";
  const line = payload.source?.line ?? 0;
  const col = payload.source?.column ?? 0;
  const tag = payload.dom?.tagName || "";
  const selector = payload.dom?.cssSelector || "";
  const ts = payload.meta?.timestamp || "";
  return `${file}:${line}:${col}:${tag}:${selector}:${ts}`;
}

export class PointrSSEClient {
  private status: ConnectionStatus = "disconnected";
  private activePort: number | null = null;
  private isRunning: boolean = false;
  private sseRequest: http.ClientRequest | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastPayloadFingerprint: string | null = null;

  private statusCallbacks: Set<StatusChangeCallback> = new Set();
  private targetCallbacks: Set<TargetCapturedCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();

  private preferredPort: number;
  private minPort: number;
  private maxPort: number;
  private pollIntervalMs: number;
  private reconnectDelayMs: number;

  constructor(options: SSEClientOptions = {}) {
    this.preferredPort = options.initialPort ?? 3333;
    this.minPort = options.minPort ?? 3333;
    this.maxPort = options.maxPort ?? 3340;
    this.pollIntervalMs = options.pollIntervalMs ?? 1500;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 2000;
  }

  public setPreferredPort(port: number): void {
    this.preferredPort = port;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getActivePort(): number | null {
    return this.activePort;
  }

  public onStatusChange(cb: StatusChangeCallback): () => void {
    this.statusCallbacks.add(cb);
    return () => this.statusCallbacks.delete(cb);
  }

  public onTargetCaptured(cb: TargetCapturedCallback): () => void {
    this.targetCallbacks.add(cb);
    return () => this.targetCallbacks.delete(cb);
  }

  public onError(cb: ErrorCallback): () => void {
    this.errorCallbacks.add(cb);
    return () => this.errorCallbacks.delete(cb);
  }

  private setStatus(status: ConnectionStatus, port?: number): void {
    this.status = status;
    if (status === "connected" && port) {
      this.activePort = port;
    } else if (status === "disconnected") {
      this.activePort = null;
    }
    for (const cb of this.statusCallbacks) {
      try {
        cb(status, this.activePort ?? undefined);
      } catch (err) {
        console.error("[Pointr SSE] Error in status callback:", err);
      }
    }
  }

  private notifyTargetCaptured(payload: PointrPayload): void {
    const fingerprint = getPayloadFingerprint(payload);
    if (this.lastPayloadFingerprint === fingerprint) {
      return; // Deduplicate
    }
    this.lastPayloadFingerprint = fingerprint;

    for (const cb of this.targetCallbacks) {
      try {
        cb(payload);
      } catch (err) {
        console.error("[Pointr SSE] Error in target callback:", err);
      }
    }
  }

  private notifyError(err: Error): void {
    for (const cb of this.errorCallbacks) {
      try {
        cb(err);
      } catch (e) {
        console.error("[Pointr SSE] Error in error callback:", e);
      }
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    await this.connect();
  }

  public stop(): void {
    this.isRunning = false;
    this.cleanupConnections();
    this.setStatus("disconnected");
  }

  private cleanupConnections(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.sseRequest) {
      this.sseRequest.destroy();
      this.sseRequest = null;
    }
  }

  public async connect(): Promise<void> {
    if (!this.isRunning) return;
    this.cleanupConnections();
    this.setStatus("connecting");

    const port = await discoverPointrPort(
      this.preferredPort,
      this.minPort,
      this.maxPort
    );

    if (!port) {
      this.setStatus("disconnected");
      this.scheduleReconnect();
      return;
    }

    this.activePort = port;
    this.connectSSE(port);
  }

  private connectSSE(port: number): void {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/events",
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          this.sseRequest = null;
          // Fallback to HTTP polling if /events is not supported
          this.startPollingFallback(port);
          return;
        }

        this.setStatus("connected", port);

        let buffer = "";
        let currentEvent = "message";

        res.on("data", (chunk: Buffer) => {
          buffer += chunk.toString("utf8");
          const lines = buffer.split("\n");
          // Keep incomplete trailing line in buffer
          buffer = lines.pop() ?? "";

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) {
              // End of an SSE message block
              currentEvent = "message";
              continue;
            }

            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const dataStr = line.slice(5).trim();
              this.handleSSEEvent(currentEvent, dataStr);
            }
          }
        });

        res.on("end", () => {
          if (this.isRunning) {
            this.setStatus("disconnected");
            this.scheduleReconnect();
          }
        });

        res.on("error", (err) => {
          this.notifyError(err);
          if (this.isRunning) {
            this.setStatus("disconnected");
            this.scheduleReconnect();
          }
        });
      }
    );

    req.on("error", (err) => {
      this.notifyError(err);
      if (this.isRunning) {
        this.setStatus("disconnected");
        this.scheduleReconnect();
      }
    });

    this.sseRequest = req;
    req.end();
  }

  private handleSSEEvent(event: string, data: string): void {
    try {
      if (event === "target-captured") {
        const payload: PointrPayload = JSON.parse(data);
        if (payload && payload.source) {
          this.notifyTargetCaptured(payload);
        }
      } else if (event === "server-status") {
        const statusData = JSON.parse(data);
        if (statusData.port) {
          this.activePort = statusData.port;
        }
      }
    } catch (err) {
      console.error("[Pointr SSE] Failed to parse event payload:", err, data);
    }
  }

  private startPollingFallback(port: number): void {
    this.setStatus("connected", port);
    this.pollTimer = setInterval(async () => {
      if (!this.isRunning) return;
      await this.pollLatest(port);
    }, this.pollIntervalMs);

    // Initial poll
    this.pollLatest(port);
  }

  private async pollLatest(port: number): Promise<void> {
    try {
      const payload = await this.fetchLatestFromPort(port);
      if (payload) {
        this.notifyTargetCaptured(payload);
      }
    } catch {
      // If polling fails, check if server went away
      const isAlive = await checkServerHealth(port);
      if (!isAlive && this.isRunning) {
        this.cleanupConnections();
        this.setStatus("disconnected");
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    if (!this.isRunning || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isRunning) {
        this.connect();
      }
    }, this.reconnectDelayMs);
  }

  public async fetchLatest(): Promise<PointrPayload | null> {
    if (!this.activePort) {
      const port = await discoverPointrPort(
        this.preferredPort,
        this.minPort,
        this.maxPort
      );
      if (!port) return null;
      this.activePort = port;
    }
    return this.fetchLatestFromPort(this.activePort);
  }

  private async fetchLatestFromPort(
    port: number
  ): Promise<PointrPayload | null> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/context/latest",
          method: "GET",
          timeout: 2000,
        },
        (res) => {
          if (res.statusCode === 200) {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              try {
                const payload = JSON.parse(data) as PointrPayload;
                resolve(payload);
              } catch (err) {
                resolve(null);
              }
            });
          } else if (res.statusCode === 404) {
            resolve(null);
          } else {
            reject(new Error(`Server returned status ${res.statusCode}`));
          }
        }
      );

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timed out"));
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.end();
    });
  }
}
