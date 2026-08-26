import * as vscode from "vscode";
import { ConnectionStatus, PointrPayload } from "./types";

export class StatusBarManager {
  private item: vscode.StatusBarItem;
  private status: ConnectionStatus = "disconnected";
  private activePort: number | null = null;
  private followMode: boolean = true;
  private lastPayload: PointrPayload | null = null;
  private flashTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.command = "pointr.openLatest";
    this.render();
    this.item.show();
  }

  public updateStatus(status: ConnectionStatus, port?: number): void {
    this.status = status;
    if (port) {
      this.activePort = port;
    } else if (status === "disconnected") {
      this.activePort = null;
    }
    this.render();
  }

  public setFollowMode(enabled: boolean): void {
    this.followMode = enabled;
    this.render();
  }

  public notifyTargetCaptured(payload: PointrPayload): void {
    this.lastPayload = payload;
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
    }

    const tag = payload.dom?.tagName
      ? `<${payload.dom.tagName.toLowerCase()}>`
      : "Element";
    const file = payload.source?.file
      ? payload.source.file.split(/[/\\]/).pop()
      : "";
    const line = payload.source?.line ?? 1;
    const locationStr = file ? `${file}:${line}` : "";

    this.item.text = `$(check) Pointr: ${tag} ${locationStr}`.trim();
    this.item.tooltip = new vscode.MarkdownString(
      `**🎯 Pointr Target Captured**\n\n` +
        `- **Element**: \`${payload.dom?.tagName || "Unknown"}\`\n` +
        `- **Selector**: \`${payload.dom?.cssSelector || ""}\`\n` +
        `- **File**: \`${payload.source?.file || "Unknown"}:${
          payload.source?.line || 1
        }:${payload.source?.column || 1}\`\n\n` +
        `*Click to re-open or focus this element.*`
    );

    this.flashTimer = setTimeout(() => {
      this.flashTimer = null;
      this.render();
    }, 3500);
  }

  private render(): void {
    if (this.flashTimer) return; // Don't override flash notification

    const followText = this.followMode ? "Auto-Open ON" : "Auto-Open OFF";

    switch (this.status) {
      case "connected":
        this.item.text = `$(target) Pointr: :${this.activePort || 3333}`;
        this.item.tooltip = new vscode.MarkdownString(
          `**🎯 Pointr Companion Connected**\n\n` +
            `- **Port**: \`${this.activePort || 3333}\`\n` +
            `- **Follow Mode**: \`${followText}\`\n\n` +
            `Click an element in your browser to instantly jump to its code.\n\n` +
            `*Click status bar to open latest captured element.*`
        );
        this.item.backgroundColor = undefined;
        this.item.command = "pointr.openLatest";
        break;

      case "connecting":
        this.item.text = `$(sync~spin) Pointr: Connecting...`;
        this.item.tooltip =
          "Searching for Pointr MCP Server on ports 3333-3340...";
        this.item.backgroundColor = undefined;
        this.item.command = "pointr.connect";
        break;

      case "disconnected":
      case "error":
      default:
        this.item.text = `$(circle-slash) Pointr: Offline`;
        this.item.tooltip = new vscode.MarkdownString(
          `**Pointr MCP Server Offline**\n\n` +
            `No active Pointr MCP server detected on ports 3333-3340.\n\n` +
            `*Click to retry connection.*`
        );
        this.item.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground"
        );
        this.item.command = "pointr.connect";
        break;
    }
  }

  public dispose(): void {
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }
    this.item.dispose();
  }
}
