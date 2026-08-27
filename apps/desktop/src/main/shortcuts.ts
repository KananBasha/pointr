import { globalShortcut, clipboard } from "electron";
import { WindowManager } from "./window";
import { McpSupervisor } from "./mcp-supervisor";

export class GlobalShortcutsManager {
  private windowManager: WindowManager;
  private supervisor: McpSupervisor;
  private registeredShortcuts: string[] = [];

  constructor(windowManager: WindowManager, supervisor: McpSupervisor) {
    this.windowManager = windowManager;
    this.supervisor = supervisor;
  }

  public registerDefaults(): void {
    // 1. Primary hotkey: Cmd+Shift+P (macOS) / Ctrl+Shift+P (Windows/Linux)
    this.register("CommandOrControl+Shift+P", async () => {
      try {
        const latest = await this.supervisor.getLatest();
        if (latest && (latest.markdown || latest.source)) {
          const textToCopy = latest.markdown || JSON.stringify(latest, null, 2);
          clipboard.writeText(textToCopy);
        }
      } catch (err: any) {
        console.warn(
          "[Shortcuts] Error fetching latest context on shortcut:",
          err.message
        );
      }

      // Also ensure dashboard is visible and focused
      this.windowManager.show();
    });

    // 2. Quick toggle hotkey: Cmd+Shift+O / Ctrl+Shift+O
    this.register("CommandOrControl+Shift+O", () => {
      this.windowManager.toggle();
    });
  }

  public register(accelerator: string, callback: () => void): boolean {
    try {
      const success = globalShortcut.register(accelerator, callback);
      if (success) {
        this.registeredShortcuts.push(accelerator);
      }
      return success;
    } catch (err: any) {
      console.warn(
        `[Shortcuts] Failed to register shortcut "${accelerator}":`,
        err.message
      );
      return false;
    }
  }

  public unregisterAll(): void {
    try {
      globalShortcut.unregisterAll();
      this.registeredShortcuts = [];
    } catch (err: any) {
      console.warn(
        "[Shortcuts] Error unregistering global shortcuts:",
        err.message
      );
    }
  }

  public getRegisteredShortcuts(): string[] {
    return [...this.registeredShortcuts];
  }
}
