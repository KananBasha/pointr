import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";
import {
  checkServerHealth,
  discoverPointrPort,
  getPayloadFingerprint,
  PointrSSEClient,
} from "../src/sse-client";
import { PointrPayload } from "../src/types";

// In-memory mock server routes
type RouteHandler = (req: any, res: MockResponse) => void;

class MockResponse extends EventEmitter {
  public statusCode: number = 200;
  public headers: Record<string, string> = {};

  writeHead(statusCode: number, headers?: Record<string, string>) {
    this.statusCode = statusCode;
    if (headers) this.headers = headers;
  }
}

class MockRequest extends EventEmitter {
  public destroyed: boolean = false;
  constructor(
    public options: any,
    public callback?: (res: MockResponse) => void
  ) {
    super();
  }

  end() {
    if (this.destroyed) return;
    const port = this.options.port;
    const path = this.options.path;
    const key = `${port}:${path}`;

    const handler = mockRoutes.get(key);
    if (!handler) {
      // Simulate connection refused
      setTimeout(() => {
        if (!this.destroyed) {
          this.emit("error", new Error(`ECONNREFUSED 127.0.0.1:${port}`));
        }
      }, 5);
      return;
    }

    const res = new MockResponse();
    handler(this, res);
    if (this.callback) {
      this.callback(res);
    }
  }

  destroy() {
    this.destroyed = true;
  }
}

const mockRoutes = new Map<string, RouteHandler>();

vi.mock("http", () => {
  return {
    default: {
      request: (options: any, callback?: any) => {
        return new MockRequest(options, callback);
      },
    },
  };
});

describe("PointrSSEClient", () => {
  const samplePayload: PointrPayload = {
    source: {
      file: "src/App.tsx",
      line: 42,
      column: 10,
    },
    dom: {
      tagName: "BUTTON",
      cssSelector: "button.submit-btn",
    },
    meta: {
      timestamp: "2026-08-26T20:00:00.000Z",
    },
  };

  beforeEach(() => {
    mockRoutes.clear();
  });

  it("computes unique payload fingerprints for deduplication", () => {
    const fp1 = getPayloadFingerprint(samplePayload);
    const fp2 = getPayloadFingerprint({ ...samplePayload });
    const fp3 = getPayloadFingerprint({
      ...samplePayload,
      source: { ...samplePayload.source, line: 99 },
    });

    expect(fp1).toBe(fp2);
    expect(fp1).not.toBe(fp3);
  });

  it("checks server health accurately", async () => {
    // 1. Unregistered port returns false
    const deadHealth = await checkServerHealth(3333, "127.0.0.1", 100);
    expect(deadHealth).toBe(false);

    // 2. Register mock health endpoint on port 3338
    mockRoutes.set("3338:/health", (_req, res) => {
      res.statusCode = 200;
      setTimeout(() => {
        res.emit("data", JSON.stringify({ status: "ok", version: "0.1.0" }));
        res.emit("end");
      }, 5);
    });

    const aliveHealth = await checkServerHealth(3338, "127.0.0.1", 500);
    expect(aliveHealth).toBe(true);
  });

  it("discovers active port in range", async () => {
    // Port 3335 is active
    mockRoutes.set("3335:/health", (_req, res) => {
      res.statusCode = 200;
      setTimeout(() => {
        res.emit("data", JSON.stringify({ status: "ok" }));
        res.emit("end");
      }, 5);
    });

    const foundPort = await discoverPointrPort(3333, 3333, 3340);
    expect(foundPort).toBe(3335);
  });

  it("receives SSE stream events", async () => {
    let sseResponse: MockResponse | null = null;

    mockRoutes.set("3333:/health", (_req, res) => {
      res.statusCode = 200;
      setTimeout(() => {
        res.emit("data", JSON.stringify({ status: "ok" }));
        res.emit("end");
      }, 5);
    });

    mockRoutes.set("3333:/events", (_req, res) => {
      res.statusCode = 200;
      sseResponse = res;
      setTimeout(() => {
        res.emit(
          "data",
          `event: server-status\ndata: ${JSON.stringify({
            status: "ok",
            port: 3333,
          })}\n\n`
        );
      }, 10);
    });

    const client = new PointrSSEClient({
      initialPort: 3333,
    });

    let receivedStatus = "";
    client.onStatusChange((status) => {
      receivedStatus = status;
    });

    let capturedPayload: PointrPayload | null = null;
    client.onTargetCaptured((payload) => {
      capturedPayload = payload;
    });

    await client.start();

    // Wait for SSE connection
    await new Promise((r) => setTimeout(r, 50));
    expect(client.getStatus()).toBe("connected");
    expect(client.getActivePort()).toBe(3333);

    // Emit target-captured event through SSE stream
    expect(sseResponse).not.toBeNull();
    sseResponse!.emit(
      "data",
      `event: target-captured\ndata: ${JSON.stringify(samplePayload)}\n\n`
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload?.source.file).toBe("src/App.tsx");
    expect(capturedPayload?.source.line).toBe(42);

    client.stop();
    expect(client.getStatus()).toBe("disconnected");
  });

  it("falls back to polling when /events is not supported", async () => {
    mockRoutes.set("3333:/health", (_req, res) => {
      res.statusCode = 200;
      setTimeout(() => {
        res.emit("data", JSON.stringify({ status: "ok" }));
        res.emit("end");
      }, 5);
    });

    mockRoutes.set("3333:/events", (_req, res) => {
      res.statusCode = 404;
      setTimeout(() => {
        res.emit("end");
      }, 5);
    });

    mockRoutes.set("3333:/context/latest", (_req, res) => {
      res.statusCode = 200;
      setTimeout(() => {
        res.emit("data", JSON.stringify(samplePayload));
        res.emit("end");
      }, 5);
    });

    const client = new PointrSSEClient({
      initialPort: 3333,
      pollIntervalMs: 50,
    });

    let capturedPayload: PointrPayload | null = null;
    client.onTargetCaptured((payload) => {
      capturedPayload = payload;
    });

    await client.start();

    await new Promise((r) => setTimeout(r, 150));
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload?.source.file).toBe("src/App.tsx");

    client.stop();
  });
});
