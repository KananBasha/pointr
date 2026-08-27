import { app, Tray, Menu, nativeImage, clipboard, NativeImage } from "electron";
import * as path from "path";
import * as fs from "fs";
import { WindowManager } from "./window";
import { McpSupervisor } from "./mcp-supervisor";

export class SystemTrayManager {
  private tray: Tray | null = null;
  private windowManager: WindowManager;
  private supervisor: McpSupervisor;

  constructor(windowManager: WindowManager, supervisor: McpSupervisor) {
    this.windowManager = windowManager;
    this.supervisor = supervisor;

    // Reactively update menu whenever supervisor state changes
    this.supervisor.on("status-change", () => {
      this.updateContextMenu();
    });
  }

  public init(): Tray {
    if (this.tray && !this.tray.isDestroyed()) {
      return this.tray;
    }

    const icon = this.resolveTrayIcon();
    this.tray = new Tray(icon);
    this.tray.setIgnoreDoubleClickEvents(true);

    this.updateContextMenu();

    this.tray.on("click", () => {
      this.windowManager.toggle();
    });

    return this.tray;
  }

  public updateContextMenu(): void {
    if (!this.tray || this.tray.isDestroyed()) return;

    const status = this.supervisor.getStatus();
    const tooltipText = status.running
      ? `Pointr Desktop — MCP Server Active (:${status.port})`
      : "Pointr Desktop — MCP Server Offline";

    this.tray.setToolTip(tooltipText);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Pointr Desktop Companion",
        enabled: false,
      },
      {
        label: status.running
          ? `● MCP Server: Active (:${status.port})${
              status.managed ? " [Managed]" : " [External]"
            }`
          : "○ MCP Server: Offline",
        enabled: false,
      },
      { type: "separator" },
      {
        label: "Open Dashboard",
        accelerator: "CommandOrControl+Shift+P",
        click: () => {
          this.windowManager.show();
        },
      },
      {
        label: "Copy Latest Target Context",
        click: async () => {
          try {
            const latest = await this.supervisor.getLatest();
            if (latest && latest.markdown) {
              clipboard.writeText(latest.markdown);
            } else if (latest) {
              clipboard.writeText(JSON.stringify(latest, null, 2));
            }
          } catch (err: any) {
            console.warn("[Tray] Failed to copy latest context:", err.message);
          }
        },
      },
      {
        label: "Restart MCP Server",
        click: async () => {
          await this.supervisor.restart();
        },
      },
      { type: "separator" },
      {
        label: "Quit Pointr",
        accelerator: process.platform === "darwin" ? "Command+Q" : "Alt+F4",
        click: () => {
          this.windowManager.setQuitting(true);
          this.supervisor.stop();
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  public getTray(): Tray | null {
    return this.tray;
  }

  public destroy(): void {
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  private resolveTrayIcon(): NativeImage | string {
    const candidates = [
      path.resolve(__dirname, "../../resources/tray-icon.png"),
      path.resolve(__dirname, "../../resources/icon.png"),
      path.resolve(process.cwd(), "apps/desktop/resources/tray-icon.png"),
      path.resolve(process.cwd(), "resources/tray-icon.png"),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        try {
          const img = nativeImage
            .createFromPath(candidate)
            .resize({ width: 16, height: 16 });
          img.setTemplateImage(true);
          return img;
        } catch {}
      }
    }

    // Programmatic fallback icon: 16x16 1-bit dot image buffer or empty template
    try {
      const empty = nativeImage.createEmpty();
      return empty;
    } catch {
      return "";
    }
  }
}
