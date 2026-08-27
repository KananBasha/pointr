export interface ServerStatus {
  running: boolean;
  managed: boolean;
  port: number;
  pid?: number | undefined;
  uptime?: number | undefined;
  payloadCount: number;
  error?: string | undefined;
}

export interface OpenEditorParams {
  file: string;
  line?: number | undefined;
  col?: number | undefined;
  editor?: "vscode" | "cursor" | undefined;
}

export interface PointrDesktopAPI {
  getServerStatus: () => Promise<ServerStatus>;
  startServer?: ((port?: number) => Promise<ServerStatus>) | undefined;
  stopServer?: (() => Promise<void>) | undefined;
  restartServer: (port?: number) => Promise<ServerStatus>;
  setPort?: ((port: number) => Promise<ServerStatus>) | undefined;
  getServerLogs: () => Promise<string[]>;
  copyToClipboard: (text: string) => Promise<boolean>;
  openInEditor: (
    fileOrParams: string | OpenEditorParams,
    line?: number,
    col?: number,
    editor?: "vscode" | "cursor"
  ) => Promise<boolean>;
  getPayloadHistory: () => Promise<any[]>;
  getLatestPayload: () => Promise<any>;
  onTargetCaptured: (callback: (payload: any) => void) => () => void;
  onPayloadReceived?:
    | ((callback: (payload: any) => void) => () => void)
    | undefined;
  onStatusChange: (callback: (status: ServerStatus) => void) => () => void;
  onServerStatusChanged?:
    | ((callback: (status: ServerStatus) => void) => () => void)
    | undefined;
  onLogMessage: (callback: (log: string) => void) => () => void;
  getAutoOpenInEditor?: (() => Promise<boolean>) | undefined;
  setAutoOpenInEditor?: ((enabled: boolean) => Promise<void>) | undefined;
}

export const IPC_CHANNELS = {
  MCP_GET_STATUS: "mcp:get-status",
  MCP_RESTART: "mcp:restart",
  MCP_GET_LOGS: "mcp:get-logs",
  CLIPBOARD_WRITE: "clipboard:write",
  EDITOR_OPEN: "editor:open",
  CONTEXT_GET_HISTORY: "context:get-history",
  CONTEXT_GET_LATEST: "context:get-latest",
  EVENT_TARGET_CAPTURED: "pointr:target-captured",
  EVENT_STATUS_CHANGE: "pointr:status-change",
  EVENT_LOG: "pointr:log",
} as const;
