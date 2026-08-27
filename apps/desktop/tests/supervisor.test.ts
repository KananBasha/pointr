import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import * as net from "net";

const { mockHttpGet } = vi.hoisted(() => {
  return {
    mockHttpGet: vi.fn(),
  };
});

vi.mock("http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("http")>();
  return {
    ...actual,
    default: {
      ...actual,
      get: mockHttpGet,
    },
    get: mockHttpGet,
  };
});

import { McpSupervisor } from "../src/main/mcp-supervisor";

describe("McpSupervisor Unit & Integration Tests", () => {
  let supervisor: McpSupervisor;

  beforeEach(() => {
    mockHttpGet.mockReset();
    supervisor = new McpSupervisor({ defaultPort: 3333, maxPort: 3340 });
  });

  afterEach(() => {
    supervisor.stop();
    vi.restoreAllMocks();
  });

  describe("Initialization & Status", () => {
    it("should initialize with default offline state", () => {
      const status = supervisor.getStatus();
      expect(status.running).toBe(false);
      expect(status.managed).toBe(false);
      expect(status.port).toBe(3333);
      expect(status.pid).toBeUndefined();
    });

    it("should maintain log history with FIFO rotation (capped at 500)", () => {
      for (let i = 0; i < 520; i++) {
        (supervisor as any).addLog(`Log line ${i}`);
      }

      const logs = supervisor.getLogs();
      expect(logs.length).toBe(500);
      expect(logs[logs.length - 1]).toContain("Log line 519");
      expect(logs[0]).toContain("Log line 20");
    });
  });

  describe("SSE Stream Parser", () => {
    it("should parse target-captured SSE event and emit with payload", () => {
      const targetPayload = {
        source: {
          file: "src/Button.tsx",
          line: 42,
          column: 8,
          snippet: "<Button />",
        },
        dom: { tagName: "BUTTON", cssSelector: ".btn-primary" },
        meta: { intent: "Refactor to secondary style" },
        markdown: "# Pointr Target",
      };

      const eventSpy = vi.fn();
      supervisor.on("target-captured", eventSpy);

      const rawSseMessage = `event: target-captured\ndata: ${JSON.stringify(
        targetPayload
      )}`;
      supervisor.parseSseMessage(rawSseMessage);

      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(targetPayload);
    });

    it("should parse server-status SSE event", () => {
      const statusSpy = vi.fn();
      supervisor.on("server-status", statusSpy);

      const rawSse = `event: server-status\ndata: {"status":"ok","port":3333}`;
      supervisor.parseSseMessage(rawSse);

      expect(statusSpy).toHaveBeenCalledTimes(1);
      expect(statusSpy).toHaveBeenCalledWith({ status: "ok", port: 3333 });
    });

    it("should handle malformed SSE messages without throwing", () => {
      const rawMalformed = `invalid message without prefix`;
      expect(() => supervisor.parseSseMessage(rawMalformed)).not.toThrow();
    });

    it("should parse generic events with fallback", () => {
      const genericSpy = vi.fn();
      supervisor.on("custom-event", genericSpy);

      const rawSse = `event: custom-event\ndata: {"custom":true}`;
      supervisor.parseSseMessage(rawSse);

      expect(genericSpy).toHaveBeenCalledWith({ custom: true });
    });
  });

  describe("Healthcheck & Port Logic", () => {
    it("should verify healthy server when /health returns status ok", async () => {
      mockHttpGet.mockImplementation((_options: any, callback?: any) => {
        const mockRes = new EventEmitter() as any;
        mockRes.statusCode = 200;

        process.nextTick(() => {
          if (callback) callback(mockRes);
          mockRes.emit(
            "data",
            JSON.stringify({ status: "ok", version: "0.1.0" })
          );
          mockRes.emit("end");
        });

        const mockReq = new EventEmitter() as any;
        mockReq.destroy = vi.fn();
        return mockReq;
      });

      const isHealthy = await supervisor.verifyHealth(3333);
      expect(isHealthy).toBe(true);
    });

    it("should return false when /health returns 500 or non-ok status", async () => {
      mockHttpGet.mockImplementation((_options: any, callback?: any) => {
        const mockRes = new EventEmitter() as any;
        mockRes.statusCode = 500;

        process.nextTick(() => {
          if (callback) callback(mockRes);
          mockRes.emit("end");
        });

        const mockReq = new EventEmitter() as any;
        mockReq.destroy = vi.fn();
        return mockReq;
      });

      const isHealthy = await supervisor.verifyHealth(3333);
      expect(isHealthy).toBe(false);
    });

    it("should return false on request error during health check", async () => {
      mockHttpGet.mockImplementation((_options: any) => {
        const mockReq = new EventEmitter() as any;
        mockReq.destroy = vi.fn();
        process.nextTick(() => {
          mockReq.emit("error", new Error("ECONNREFUSED"));
        });
        return mockReq;
      });

      const isHealthy = await supervisor.verifyHealth(3333);
      expect(isHealthy).toBe(false);
    });

    it("should detect port in use when socket connects successfully", async () => {
      vi.spyOn(net.Socket.prototype, "connect").mockImplementation(function (
        this: any
      ) {
        process.nextTick(() => {
          this.emit("connect");
        });
        return this;
      });

      const inUse = await supervisor.checkPortInUse(3333);
      expect(inUse).toBe(true);
    });

    it("should detect port free when socket emits error", async () => {
      vi.spyOn(net.Socket.prototype, "connect").mockImplementation(function (
        this: any
      ) {
        process.nextTick(() => {
          this.emit("error", new Error("ECONNREFUSED"));
        });
        return this;
      });

      const inUse = await supervisor.checkPortInUse(3333);
      expect(inUse).toBe(false);
    });
  });

  describe("History & Latest Fetching", () => {
    it("should fetch latest context payload", async () => {
      const payload = {
        markdown: "# Latest Context",
        source: { file: "index.ts" },
      };
      vi.spyOn(supervisor as any, "httpGetJson").mockResolvedValue(payload);

      const latest = await supervisor.getLatest();
      expect(latest).toEqual(payload);
    });

    it("should return null when getLatest fails", async () => {
      vi.spyOn(supervisor as any, "httpGetJson").mockRejectedValue(
        new Error("404")
      );
      const latest = await supervisor.getLatest();
      expect(latest).toBeNull();
    });

    it("should fetch context history array", async () => {
      const history = [{ id: 1 }, { id: 2 }];
      vi.spyOn(supervisor as any, "httpGetJson").mockResolvedValue(history);

      const res = await supervisor.getHistory();
      expect(res).toEqual(history);
    });

    it("should return empty array if getHistory fails", async () => {
      vi.spyOn(supervisor as any, "httpGetJson").mockRejectedValue(
        new Error("Network error")
      );
      const res = await supervisor.getHistory();
      expect(res).toEqual([]);
    });
  });

  describe("Lifecycle & Stop", () => {
    it("should clean up child process, SSE connections, and emit status-change on stop()", () => {
      const statusChangeSpy = vi.fn();
      supervisor.on("status-change", statusChangeSpy);

      const mockChild = {
        pid: 12345,
        kill: vi.fn(),
      } as any;

      (supervisor as any).child = mockChild;
      (supervisor as any).isRunning = true;
      (supervisor as any).isManaged = true;

      supervisor.stop();

      expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");
      const status = supervisor.getStatus();
      expect(status.running).toBe(false);
      expect(status.managed).toBe(false);
      expect(statusChangeSpy).toHaveBeenCalledWith(status);
    });
  });
});
