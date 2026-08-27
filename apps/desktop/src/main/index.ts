import { app } from "electron";
import squirrelStartup from "electron-squirrel-startup";
import { WindowManager } from "./window";
import { McpSupervisor } from "./mcp-supervisor";
import { SystemTrayManager } from "./tray";
import { GlobalShortcutsManager } from "./shortcuts";
import { IpcManager } from "./ipc";

// Handle Windows installer events early
if (squirrelStartup) {
  app.quit();
}

// Ensure single instance lock
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  // Core Services
  const windowManager = new WindowManager();
  const supervisor = new McpSupervisor();
  const trayManager = new SystemTrayManager(windowManager, supervisor);
  const shortcutsManager = new GlobalShortcutsManager(
    windowManager,
    supervisor
  );
  const ipcManager = new IpcManager(windowManager, supervisor);

  app.on("second-instance", () => {
    // Focus window when a second instance tries to launch
    windowManager.show();
  });

  app.whenReady().then(async () => {
    // Set Application User Model ID for Windows toast notifications
    if (process.platform === "win32") {
      app.setAppUserModelId("dev.pointr.desktop");
    }

    // 1. Register IPC handlers before window creates
    ipcManager.registerHandlers();

    // 2. Initialize native window
    windowManager.createWindow();

    // 3. Initialize native system tray
    trayManager.init();

    // 4. Register global keyboard shortcuts (Cmd+Shift+P)
    shortcutsManager.registerDefaults();

    // 5. Start or connect to MCP Server process
    try {
      await supervisor.startOrConnect();
    } catch (err: any) {
      console.error("[Main] Failed to start MCP supervisor:", err.message);
    }
  });

  // App Lifecycle Hooks
  app.on("before-quit", () => {
    windowManager.setQuitting(true);
    supervisor.stop();
  });

  app.on("will-quit", () => {
    shortcutsManager.unregisterAll();
    ipcManager.unregisterHandlers();
  });

  app.on("window-all-closed", () => {
    // On macOS, apps keep running in background/tray until explicit Cmd+Q
    if (process.platform !== "darwin") {
      // In tray mode, we keep running unless quit from tray menu
    }
  });

  app.on("activate", () => {
    windowManager.show();
  });
}
