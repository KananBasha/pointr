import { contextBridge, ipcRenderer } from "electron";
import {
  IPC_CHANNELS,
  OpenEditorParams,
  PointrDesktopAPI,
  ServerStatus,
} from "../types/ipc";

const pointrDesktop: PointrDesktopAPI = {
  getServerStatus: (): Promise<ServerStatus> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MCP_GET_STATUS);
  },

  restartServer: (_port?: number): Promise<ServerStatus> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MCP_RESTART);
  },

  getServerLogs: (): Promise<string[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MCP_GET_LOGS);
  },

  copyToClipboard: (text: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_WRITE, text);
  },

  openInEditor: (
    fileOrParams: string | OpenEditorParams,
    line?: number,
    col?: number,
    editor?: "vscode" | "cursor"
  ): Promise<boolean> => {
    if (typeof fileOrParams === "string") {
      return ipcRenderer.invoke(IPC_CHANNELS.EDITOR_OPEN, {
        file: fileOrParams,
        line,
        col,
        editor,
      });
    }
    return ipcRenderer.invoke(IPC_CHANNELS.EDITOR_OPEN, fileOrParams);
  },

  getPayloadHistory: (): Promise<any[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONTEXT_GET_HISTORY);
  },

  getLatestPayload: (): Promise<any> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CONTEXT_GET_LATEST);
  },

  onTargetCaptured: (callback: (payload: any) => void): (() => void) => {
    const handler = (_event: any, payload: any) => {
      callback(payload);
    };
    ipcRenderer.on(IPC_CHANNELS.EVENT_TARGET_CAPTURED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_TARGET_CAPTURED, handler);
    };
  },

  onPayloadReceived: (callback: (payload: any) => void): (() => void) => {
    const handler = (_event: any, payload: any) => {
      callback(payload);
    };
    ipcRenderer.on(IPC_CHANNELS.EVENT_TARGET_CAPTURED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_TARGET_CAPTURED, handler);
    };
  },

  onStatusChange: (callback: (status: ServerStatus) => void): (() => void) => {
    const handler = (_event: any, status: ServerStatus) => {
      callback(status);
    };
    ipcRenderer.on(IPC_CHANNELS.EVENT_STATUS_CHANGE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_STATUS_CHANGE, handler);
    };
  },

  onServerStatusChanged: (
    callback: (status: ServerStatus) => void
  ): (() => void) => {
    const handler = (_event: any, status: ServerStatus) => {
      callback(status);
    };
    ipcRenderer.on(IPC_CHANNELS.EVENT_STATUS_CHANGE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_STATUS_CHANGE, handler);
    };
  },

  onLogMessage: (callback: (log: string) => void): (() => void) => {
    const handler = (_event: any, log: string) => {
      callback(log);
    };
    ipcRenderer.on(IPC_CHANNELS.EVENT_LOG, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_LOG, handler);
    };
  },
};

// Safe Context Isolation Exposure
try {
  contextBridge.exposeInMainWorld("pointrDesktop", pointrDesktop);
} catch {
  // If contextIsolation is off (e.g. tests), assign to window
  if (typeof window !== "undefined") {
    (window as any).pointrDesktop = pointrDesktop;
  }
}

export { pointrDesktop };
export type { PointrDesktopAPI, ServerStatus, OpenEditorParams };

declare global {
  interface Window {
    pointrDesktop?: PointrDesktopAPI | undefined;
  }
}
