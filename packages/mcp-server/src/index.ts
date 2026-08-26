import express from "express";
import cors from "cors";
import { createServer as createHttpServer } from "http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { store } from "./store.js";
import { createMcpServer } from "./mcp-handler.js";
import { PointrPayload } from "./types.js";

export async function createServer(
  port: number = 3333
): Promise<{ server: any; port: number }> {
  const app = express();
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like curl, MCP agents, Postman, IDEs)
        if (!origin) return callback(null, true);
        // Allow local development environments (localhost, 127.0.0.1, 0.0.0.0)
        const isLocalhost =
          /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(
            origin
          );
        if (isLocalhost) {
          return callback(null, true);
        }
        return callback(new Error("CORS origin not allowed by Pointr"), false);
      },
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(express.json({ limit: "50mb" }));

  const mcpServer = createMcpServer();
  let sseTransport: SSEServerTransport | null = null;

  app.post("/context", (req, res) => {
    try {
      const payload = req.body as PointrPayload;
      if (!payload || !payload.source || !payload.dom) {
        return res.status(400).json({ error: "Invalid payload schema" });
      }
      store.push(payload);

      console.log("\n--------------------------------------------------");
      console.log(`🎯 [Pointr] Target Captured!`);
      console.log(
        `📁 Source: ${payload.source.file || "Unknown"}:${
          payload.source.line || 0
        }:${payload.source.column || 0}`
      );
      console.log(
        `🏷️  Element: <${payload.dom.tagName}> ${
          payload.dom.cssSelector ? `(${payload.dom.cssSelector})` : ""
        }`
      );
      if (payload.meta?.intent) {
        console.log(`💬 Intent: "${payload.meta.intent}"`);
      }
      console.log(`📦 Status: Stored & ready for AI Agent`);
      console.log("--------------------------------------------------\n");

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("[Pointr] Error processing payload:", err);
      res.status(500).json({ error: "Failed to process payload" });
    }
  });

  app.get("/context/latest", (req, res) => {
    const latest = store.getLatest();
    if (!latest) {
      return res.status(404).json({ error: "No payload found" });
    }
    res.json(latest);
  });

  app.get("/context/history", (req, res) => {
    res.json(store.getAll());
  });

  app.get("/context/recent/:count", (req, res) => {
    const count = parseInt(req.params.count, 10) || 3;
    const all = store.getAll();
    res.json(all.slice(-count));
  });

  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      version: "0.1.0",
      payloadCount: store.getAll().length,
    });
  });

  const transports = new Map<string, SSEServerTransport>();

  app.get("/mcp", async (req, res) => {
    try {
      const transport = new SSEServerTransport("/message", res);
      transports.set(transport.sessionId, transport);
      res.on("close", () => {
        transports.delete(transport.sessionId);
      });
      await mcpServer.server.connect(transport);
    } catch (err) {
      console.error("[Pointr] Error in SSE connection:", err);
      if (!res.headersSent) {
        res.status(500).send("Error initializing SSE transport");
      }
    }
  });

  app.post("/message", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport =
      (sessionId && transports.get(sessionId)) ||
      Array.from(transports.values())[0];
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(404).send("Session not found");
    }
  });

  return new Promise((resolve, reject) => {
    const tryPort = (currentPort: number) => {
      if (currentPort > 3340) {
        reject(new Error("No available ports between 3333 and 3340"));
        return;
      }

      const server = createHttpServer(app);
      server.listen(currentPort, () => {
        resolve({ server, port: currentPort });
      });

      server.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          tryPort(currentPort + 1);
        } else {
          reject(err);
        }
      });
    };

    tryPort(port);
  });
}
