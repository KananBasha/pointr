import * as vscode from "vscode";
import { PointrSSEClient } from "./sse-client";
import { StatusBarManager } from "./status-bar";
import { openSourceLocation, disposeDecorations } from "./file-opener";
import { ExtensionConfig, PointrPayload } from "./types";

let client: PointrSSEClient | null = null;
let statusBar: StatusBarManager | null = null;

function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration("pointr");
  return {
    serverPort: config.get<number>("serverPort", 3333),
    autoOpen: config.get<boolean>("autoOpen", true),
    highlightDuration: config.get<number>("highlightDuration", 2000),
  };
}

export function activate(context: vscode.ExtensionContext): void {
  const initialConfig = getConfig();

  // Initialize status bar
  statusBar = new StatusBarManager();
  statusBar.setFollowMode(initialConfig.autoOpen);
  context.subscriptions.push(statusBar);

  // Initialize SSE Client
  client = new PointrSSEClient({
    initialPort: initialConfig.serverPort,
  });

  // Handle connection status changes
  client.onStatusChange((status, port) => {
    statusBar?.updateStatus(status, port);
  });

  // Handle incoming target selections from browser overlay
  client.onTargetCaptured(async (payload: PointrPayload) => {
    statusBar?.notifyTargetCaptured(payload);

    const config = getConfig();
    if (config.autoOpen && payload.source?.file) {
      await openSourceLocation(payload.source, {
        highlightDuration: config.highlightDuration,
      });
    }
  });

  // Command: Reconnect to MCP Server
  const connectCmd = vscode.commands.registerCommand(
    "pointr.connect",
    async () => {
      if (!client) return;
      vscode.window.showInformationMessage(
        "Pointr: Searching for active MCP server..."
      );
      await client.connect();
      const activePort = client.getActivePort();
      if (activePort) {
        vscode.window.showInformationMessage(
          `Pointr: Successfully connected to MCP server on port ${activePort}`
        );
      } else {
        vscode.window.showWarningMessage(
          "Pointr: No active MCP server found on ports 3333-3340. Make sure your dev server or 'pointr-mcp' is running."
        );
      }
    }
  );

  // Command: Open Latest Selected Element
  const openLatestCmd = vscode.commands.registerCommand(
    "pointr.openLatest",
    async () => {
      if (!client) return;
      const payload = await client.fetchLatest();
      if (!payload || !payload.source?.file) {
        vscode.window.showInformationMessage(
          "Pointr: No element captured yet. Click any element in your browser overlay to select it."
        );
        return;
      }

      statusBar?.notifyTargetCaptured(payload);
      const config = getConfig();
      await openSourceLocation(payload.source, {
        highlightDuration: config.highlightDuration,
      });
    }
  );

  // Command: Toggle Auto-Open Follow Mode
  const toggleFollowCmd = vscode.commands.registerCommand(
    "pointr.toggleFollow",
    async () => {
      const config = vscode.workspace.getConfiguration("pointr");
      const current = config.get<boolean>("autoOpen", true);
      const next = !current;
      await config.update("autoOpen", next, vscode.ConfigurationTarget.Global);
      statusBar?.setFollowMode(next);
      vscode.window.showInformationMessage(
        `Pointr: Auto-Open Follow Mode is now ${next ? "ENABLED" : "DISABLED"}`
      );
    }
  );

  // Listen for config changes
  const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("pointr.serverPort")) {
      const cfg = getConfig();
      client?.setPreferredPort(cfg.serverPort);
      client?.connect();
    }
    if (e.affectsConfiguration("pointr.autoOpen")) {
      const cfg = getConfig();
      statusBar?.setFollowMode(cfg.autoOpen);
    }
  });

  context.subscriptions.push(
    connectCmd,
    openLatestCmd,
    toggleFollowCmd,
    configWatcher
  );

  // Start background connection daemon
  client.start();
}

export function deactivate(): void {
  if (client) {
    client.stop();
    client = null;
  }
  if (statusBar) {
    statusBar.dispose();
    statusBar = null;
  }
  disposeDecorations();
}
