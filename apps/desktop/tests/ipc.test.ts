import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockIpcMain, mockClipboard, mockShell } = vi.hoisted(() => {
  const handlers = new Map<string, Function>();
  return {
    mockIpcMain: {
      handlers,
      handle: vi.fn((channel: string, fn: Function) => {
        handlers.set(channel, fn);
      }),
      handleOnce: vi.fn(),
      removeHandler: vi.fn((channel: string) => {
        handlers.delete(channel);
      }),
    },
    mockClipboard: {
      writeText: vi.fn(),
      readText: vi.fn().mockReturnValue(""),
    },
    mockShell: {
      openExternal: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock("electron", () => ({
  ipcMain: mockIpcMain,
  clipboard: mockClipboard,
  shell: mockShell,
  app: {
    whenReady: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn(),
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
    isPackaged: false,
    setAppUserModelId: vi.fn(),
    on: vi.fn(),
  },
}));

import { IpcManager } from "../src/main/ipc";
import { IPC_CHANNELS } from "../src/types/ipc";

describe("IpcManager & Security Boundary Tests", () => {
  let mockWindowManager: any;
  let mockSupervisor: any;
  let mockWebContents: any;
  let ipcManager: IpcManager;

  beforeEach(() => {
    mockIpcMain.handlers.clear();
    vi.clearAllMocks();

    mockWebContents = {
      send: vi.fn(),
    };

    mockWindowManager = {
      getWindow: vi.fn().mockReturnValue({
        isDestroyed: () => false,
        webContents: mockWebContents,
      }),
      show: vi.fn(),
      hide: vi.fn(),
      toggle: vi.fn(),
    };

    mockSupervisor = {
      getStatus: vi.fn().mockReturnValue({
        running: true,
        managed: true,
        port: 3333,
        payloadCount: 5,
      }),
      restart: vi.fn().mockResolvedValue({
        running: true,
        managed: true,
        port: 3333,
        payloadCount: 0,
      }),
      getLogs: vi
        .fn()
        .mockReturnValue([
          "[10:00:00] Server started",
          "[10:00:01] SSE client connected",
        ]),
      getLatest: vi
        .fn()
        .mockResolvedValue({ id: "target-1", markdown: "# Test" }),
      getHistory: vi
        .fn()
        .mockResolvedValue([{ id: "target-1" }, { id: "target-2" }]),
      on: vi.fn(),
    };

    ipcManager = new IpcManager(mockWindowManager, mockSupervisor);
    ipcManager.registerHandlers();
  });

  describe("URI Security Validation", () => {
    it("should allow valid vscode:// URIs", () => {
      expect(
        ipcManager.isValidEditorUri("vscode://file/Users/dev/App.tsx:10:5")
      ).toBe(true);
    });

    it("should allow valid cursor:// URIs", () => {
      expect(
        ipcManager.isValidEditorUri("cursor://file/Users/dev/App.tsx:10:5")
      ).toBe(true);
    });

    it("should reject unsafe protocols (javascript:, data:, file:, powershell, etc.)", () => {
      expect(ipcManager.isValidEditorUri("javascript:alert(1)")).toBe(false);
      expect(
        ipcManager.isValidEditorUri("data:text/html,<script></script>")
      ).toBe(false);
      expect(ipcManager.isValidEditorUri("powershell.exe -Command rm")).toBe(
        false
      );
      expect(
        ipcManager.isValidEditorUri("smb://192.168.1.1/malicious.exe")
      ).toBe(false);
      expect(ipcManager.isValidEditorUri("")).toBe(false);
    });
  });

  describe("IPC Channel Schema & Definitions", () => {
    it("should define all required IPC channel constants", () => {
      expect(IPC_CHANNELS.MCP_GET_STATUS).toBe("mcp:get-status");
      expect(IPC_CHANNELS.MCP_RESTART).toBe("mcp:restart");
      expect(IPC_CHANNELS.MCP_GET_LOGS).toBe("mcp:get-logs");
      expect(IPC_CHANNELS.CLIPBOARD_WRITE).toBe("clipboard:write");
      expect(IPC_CHANNELS.EDITOR_OPEN).toBe("editor:open");
      expect(IPC_CHANNELS.CONTEXT_GET_HISTORY).toBe("context:get-history");
      expect(IPC_CHANNELS.CONTEXT_GET_LATEST).toBe("context:get-latest");
      expect(IPC_CHANNELS.EVENT_TARGET_CAPTURED).toBe("pointr:target-captured");
      expect(IPC_CHANNELS.EVENT_STATUS_CHANGE).toBe("pointr:status-change");
      expect(IPC_CHANNELS.EVENT_LOG).toBe("pointr:log");
    });

    it("should register all expected IPC handles in ipcMain", () => {
      expect(mockIpcMain.handlers.has(IPC_CHANNELS.MCP_GET_STATUS)).toBe(true);
      expect(mockIpcMain.handlers.has(IPC_CHANNELS.MCP_RESTART)).toBe(true);
      expect(mockIpcMain.handlers.has(IPC_CHANNELS.MCP_GET_LOGS)).toBe(true);
      expect(mockIpcMain.handlers.has(IPC_CHANNELS.CLIPBOARD_WRITE)).toBe(true);
      expect(mockIpcMain.handlers.has(IPC_CHANNELS.EDITOR_OPEN)).toBe(true);
      expect(mockIpcMain.handlers.has(IPC_CHANNELS.CONTEXT_GET_HISTORY)).toBe(
        true
      );
      expect(mockIpcMain.handlers.has(IPC_CHANNELS.CONTEXT_GET_LATEST)).toBe(
        true
      );
    });
  });

  describe("Handler Invocations & Input Validation", () => {
    it("should return server status on mcp:get-status", async () => {
      const handler = mockIpcMain.handlers.get(IPC_CHANNELS.MCP_GET_STATUS)!;
      const result = await handler();
      expect(result).toEqual({
        running: true,
        managed: true,
        port: 3333,
        payloadCount: 5,
      });
      expect(mockSupervisor.getStatus).toHaveBeenCalled();
    });

    it("should restart server on mcp:restart", async () => {
      const handler = mockIpcMain.handlers.get(IPC_CHANNELS.MCP_RESTART)!;
      const result = await handler();
      expect(result.running).toBe(true);
      expect(mockSupervisor.restart).toHaveBeenCalled();
    });

    it("should return log lines on mcp:get-logs", async () => {
      const handler = mockIpcMain.handlers.get(IPC_CHANNELS.MCP_GET_LOGS)!;
      const logs = await handler();
      expect(logs).toHaveLength(2);
      expect(logs[0]).toContain("Server started");
    });

    it("should write text to clipboard and return true on clipboard:write", async () => {
      const handler = mockIpcMain.handlers.get(IPC_CHANNELS.CLIPBOARD_WRITE)!;
      const success = await handler({}, "Sample Pointr Markdown");
      expect(success).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        "Sample Pointr Markdown"
      );
    });

    it("should reject non-string input on clipboard:write", async () => {
      const handler = mockIpcMain.handlers.get(IPC_CHANNELS.CLIPBOARD_WRITE)!;
      const success = await handler({}, 12345);
      expect(success).toBe(false);
      expect(mockClipboard.writeText).not.toHaveBeenCalled();
    });

    it("should open VS Code editor with formatted URI on editor:open", async () => {
      const handler = mockIpcMain.handlers.get(IPC_CHANNELS.EDITOR_OPEN)!;
      const success = await handler(
        {},
        {
          file: "src/components/Header.tsx",
          line: 25,
          col: 4,
          editor: "vscode",
        }
      );
      expect(success).toBe(true);
      expect(mockShell.openExternal).toHaveBeenCalledWith(
        "vscode://file/src/components/Header.tsx:25:4"
      );
    });

    it("should open Cursor editor with cursor:// URI when specified", async () => {
      const handler = mockIpcMain.handlers.get(IPC_CHANNELS.EDITOR_OPEN)!;
      const success = await handler(
        {},
        {
          file: "/Users/test/App.tsx",
          line: 12,
          col: 1,
          editor: "cursor",
        }
      );
      expect(success).toBe(true);
      expect(mockShell.openExternal).toHaveBeenCalledWith(
        "cursor://file/Users/test/App.tsx:12:1"
      );
    });

    it("should reject invalid or empty file parameter on editor:open", async () => {
      const handler = mockIpcMain.handlers.get(IPC_CHANNELS.EDITOR_OPEN)!;
      const successEmpty = await handler({}, { file: "" });
      expect(successEmpty).toBe(false);

      const successNull = await handler({}, null);
      expect(successNull).toBe(false);
    });

    it("should retrieve context history on context:get-history", async () => {
      const handler = mockIpcMain.handlers.get(
        IPC_CHANNELS.CONTEXT_GET_HISTORY
      )!;
      const history = await handler();
      expect(history).toHaveLength(2);
      expect(mockSupervisor.getHistory).toHaveBeenCalled();
    });

    it("should retrieve latest payload on context:get-latest", async () => {
      const handler = mockIpcMain.handlers.get(
        IPC_CHANNELS.CONTEXT_GET_LATEST
      )!;
      const latest = await handler();
      expect(latest).toEqual({ id: "target-1", markdown: "# Test" });
      expect(mockSupervisor.getLatest).toHaveBeenCalled();
    });
  });

  describe("Event Forwarding", () => {
    it("should forward target-captured events to renderer webContents", () => {
      const listenerMap = new Map<string, Function>();
      mockSupervisor.on.mockImplementation((evt: string, fn: Function) => {
        listenerMap.set(evt, fn);
      });

      ipcManager.setupEventForwarding();

      const targetCapturedListener = listenerMap.get("target-captured");
      expect(targetCapturedListener).toBeDefined();

      const testPayload = { source: { file: "App.tsx", line: 10 } };
      targetCapturedListener!(testPayload);

      expect(mockWebContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.EVENT_TARGET_CAPTURED,
        testPayload
      );
    });

    it("should forward status-change events to renderer webContents", () => {
      const listenerMap = new Map<string, Function>();
      mockSupervisor.on.mockImplementation((evt: string, fn: Function) => {
        listenerMap.set(evt, fn);
      });

      ipcManager.setupEventForwarding();

      const statusChangeListener = listenerMap.get("status-change");
      expect(statusChangeListener).toBeDefined();

      const newStatus = {
        running: true,
        port: 3334,
        managed: false,
        payloadCount: 0,
      };
      statusChangeListener!(newStatus);

      expect(mockWebContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.EVENT_STATUS_CHANGE,
        newStatus
      );
    });

    it("should forward log events to renderer webContents", () => {
      const listenerMap = new Map<string, Function>();
      mockSupervisor.on.mockImplementation((evt: string, fn: Function) => {
        listenerMap.set(evt, fn);
      });

      ipcManager.setupEventForwarding();

      const logListener = listenerMap.get("log");
      expect(logListener).toBeDefined();

      logListener!("[INFO] Server started");

      expect(mockWebContents.send).toHaveBeenCalledWith(
        IPC_CHANNELS.EVENT_LOG,
        "[INFO] Server started"
      );
    });
  });

  describe("Cleanup & Unregistration", () => {
    it("should remove all IPC handlers on unregisterHandlers()", () => {
      ipcManager.unregisterHandlers();
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        IPC_CHANNELS.MCP_GET_STATUS
      );
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        IPC_CHANNELS.MCP_RESTART
      );
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        IPC_CHANNELS.MCP_GET_LOGS
      );
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        IPC_CHANNELS.CLIPBOARD_WRITE
      );
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        IPC_CHANNELS.EDITOR_OPEN
      );
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        IPC_CHANNELS.CONTEXT_GET_HISTORY
      );
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(
        IPC_CHANNELS.CONTEXT_GET_LATEST
      );
    });
  });
});
