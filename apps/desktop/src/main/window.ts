import { BrowserWindow, app } from "electron";
import * as path from "path";

export interface WindowManagerOptions {
  preloadPath?: string;
  devServerUrl?: string;
  isDev?: boolean;
}

export class WindowManager {
  private window: BrowserWindow | null = null;
  private isQuitting = false;
  private preloadPath: string;
  private devServerUrl?: string;
  private isDev: boolean;

  constructor(options: WindowManagerOptions = {}) {
    this.isDev =
      options.isDev ??
      (!app.isPackaged || process.env.NODE_ENV === "development");
    this.preloadPath =
      options.preloadPath || path.join(__dirname, "../preload/index.js");
    this.devServerUrl =
      options.devServerUrl ||
      process.env.VITE_DEV_SERVER_URL ||
      "http://localhost:5173";
  }

  public createWindow(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) {
      this.show();
      return this.window;
    }

    this.window = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      show: false,
      backgroundColor: "#09090B",
      title: "Pointr Desktop Companion",
      titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
      trafficLightPosition: { x: 16, y: 16 },
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });

    // Gracefully show window when ready
    this.window.on("ready-to-show", () => {
      this.window?.show();
      this.window?.focus();
    });

    // Hide to tray on close unless quitting
    this.window.on("close", (event: any) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.window?.hide();
      }
    });

    this.window.on("closed", () => {
      this.window = null;
    });

    this.loadContent();
    return this.window;
  }

  public loadContent(): void {
    if (!this.window) return;

    if (this.isDev && this.devServerUrl) {
      this.window.loadURL(this.devServerUrl).catch(() => {
        // Fallback to local file if dev server is unreachable
        this.loadLocalRenderer();
      });
    } else {
      this.loadLocalRenderer();
    }
  }

  private loadLocalRenderer(): void {
    const rendererPath = path.join(__dirname, "../renderer/index.html");
    this.window?.loadFile(rendererPath).catch((err) => {
      console.warn(
        `[WindowManager] Could not load renderer at ${rendererPath}:`,
        err.message
      );
    });
  }

  public show(): void {
    if (!this.window || this.window.isDestroyed()) {
      this.createWindow();
      return;
    }

    if (this.window.isMinimized()) {
      this.window.restore();
    }
    this.window.show();
    this.window.focus();
  }

  public hide(): void {
    this.window?.hide();
  }

  public toggle(): void {
    if (!this.window || this.window.isDestroyed()) {
      this.createWindow();
      return;
    }

    if (this.window.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  public focus(): void {
    this.window?.focus();
  }

  public isVisible(): boolean {
    return this.window?.isVisible() ?? false;
  }

  public getWindow(): BrowserWindow | null {
    return this.window;
  }

  public setQuitting(flag: boolean): void {
    this.isQuitting = flag;
  }
}
