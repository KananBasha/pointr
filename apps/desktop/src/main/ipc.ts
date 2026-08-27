import { ipcMain, clipboard, shell } from "electron";
import { WindowManager } from "./window";
import { McpSupervisor } from "./mcp-supervisor";
import { IPC_CHANNELS, OpenEditorParams, ServerStatus } from "../types/ipc";

export class IpcManager {
  private windowManager: WindowManager;
  private supervisor: McpSupervisor;

  constructor(windowManager: WindowManager, supervisor: McpSupervisor) {
    this.windowManager = windowManager;
    this.supervisor = supervisor;
  }

  public registerHandlers(): void {
    // 1. Get Server Status
    ipcMain.handle(
      IPC_CHANNELS.MCP_GET_STATUS,
      async (): Promise<ServerStatus> => {
        return this.supervisor.getStatus();
      }
    );

    // 2. Restart Server
    ipcMain.handle(
      IPC_CHANNELS.MCP_RESTART,
      async (): Promise<ServerStatus> => {
        return this.supervisor.restart();
      }
    );

    // 3. Get Server Logs
    ipcMain.handle(IPC_CHANNELS.MCP_GET_LOGS, async (): Promise<string[]> => {
      return this.supervisor.getLogs();
    });

    // 4. Clipboard Write
    ipcMain.handle(
      IPC_CHANNELS.CLIPBOARD_WRITE,
      async (_event: any, text: string): Promise<boolean> => {
        if (typeof text !== "string") return false;
        try {
          clipboard.writeText(text);
          return true;
        } catch (err: any) {
          console.warn("[IPC] Clipboard write error:", err.message);
          return false;
        }
      }
    );

    // 5. Open In Editor (VS Code / Cursor)
    ipcMain.handle(
      IPC_CHANNELS.EDITOR_OPEN,
      async (_event: any, params: OpenEditorParams): Promise<boolean> => {
        if (!params || !params.file || typeof params.file !== "string") {
          return false;
        }

        const editorScheme = params.editor === "cursor" ? "cursor" : "vscode";
        const line =
          typeof params.line === "number" && params.line > 0 ? params.line : 1;
        const col =
          typeof params.col === "number" && params.col > 0 ? params.col : 1;

        // Clean and format file URI
        const cleanFile = params.file.startsWith("/")
          ? params.file
          : `/${params.file}`;
        const uri = `${editorScheme}://file${encodeURI(
          cleanFile
        )}:${line}:${col}`;

        // Security check: validate protocol
        if (!this.isValidEditorUri(uri)) {
          console.warn("[IPC] Blocked unsafe editor URI:", uri);
          return false;
        }

        try {
          await shell.openExternal(uri);
          return true;
        } catch (err: any) {
          console.warn("[IPC] Error opening editor URI:", err.message);
          return false;
        }
      }
    );

    // 6. Get Payload History
    ipcMain.handle(
      IPC_CHANNELS.CONTEXT_GET_HISTORY,
      async (): Promise<any[]> => {
        return this.supervisor.getHistory();
      }
    );

    // 7. Get Latest Payload
    ipcMain.handle(
      IPC_CHANNELS.CONTEXT_GET_LATEST,
      async (): Promise<any | null> => {
        return this.supervisor.getLatest();
      }
    );

    // Attach Supervisor Event Forwarders to Renderer WebContents
    this.setupEventForwarding();
  }

  public setupEventForwarding(): void {
    this.supervisor.on("target-captured", (payload: any) => {
      const window = this.windowManager.getWindow();
      if (window && !window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.EVENT_TARGET_CAPTURED, payload);
      }
    });

    this.supervisor.on("status-change", (status: ServerStatus) => {
      const window = this.windowManager.getWindow();
      if (window && !window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.EVENT_STATUS_CHANGE, status);
      }
    });

    this.supervisor.on("log", (logLine: string) => {
      const window = this.windowManager.getWindow();
      if (window && !window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.EVENT_LOG, logLine);
      }
    });
  }

  public unregisterHandlers(): void {
    ipcMain.removeHandler(IPC_CHANNELS.MCP_GET_STATUS);
    ipcMain.removeHandler(IPC_CHANNELS.MCP_RESTART);
    ipcMain.removeHandler(IPC_CHANNELS.MCP_GET_LOGS);
    ipcMain.removeHandler(IPC_CHANNELS.CLIPBOARD_WRITE);
    ipcMain.removeHandler(IPC_CHANNELS.EDITOR_OPEN);
    ipcMain.removeHandler(IPC_CHANNELS.CONTEXT_GET_HISTORY);
    ipcMain.removeHandler(IPC_CHANNELS.CONTEXT_GET_LATEST);
  }

  public isValidEditorUri(uri: string): boolean {
    if (!uri || typeof uri !== "string") return false;
    const allowedProtocols = ["vscode://", "cursor://", "http://", "https://"];
    return allowedProtocols.some((protocol) => uri.startsWith(protocol));
  }
}
