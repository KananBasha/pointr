declare module "electron-squirrel-startup" {
  const started: boolean;
  export default started;
}

declare module "electron" {
  import { EventEmitter } from "events";

  export interface App extends EventEmitter {
    whenReady(): Promise<void>;
    quit(): void;
    requestSingleInstanceLock(): boolean;
    isPackaged: boolean;
    setAppUserModelId(id: string): void;
    on(
      event:
        | "ready"
        | "will-quit"
        | "before-quit"
        | "window-all-closed"
        | "activate"
        | "second-instance",
      listener: (...args: any[]) => void
    ): this;
  }

  export interface WebPreferences {
    preload?: string;
    contextIsolation?: boolean;
    nodeIntegration?: boolean;
    sandbox?: boolean;
    webSecurity?: boolean;
    allowRunningInsecureContent?: boolean;
    [key: string]: any;
  }

  export interface BrowserWindowOptions {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    show?: boolean;
    backgroundColor?: string;
    titleBarStyle?:
      | "default"
      | "hidden"
      | "hiddenInset"
      | "customButtonsOnHover";
    trafficLightPosition?: { x: number; y: number };
    webPreferences?: WebPreferences;
    icon?: string | NativeImage;
    [key: string]: any;
  }

  export interface WebContents extends EventEmitter {
    send(channel: string, ...args: any[]): void;
    openDevTools(options?: any): void;
    isDestroyed(): boolean;
  }

  export class BrowserWindow extends EventEmitter {
    constructor(options?: BrowserWindowOptions);
    webContents: WebContents;
    show(): void;
    hide(): void;
    focus(): void;
    isVisible(): boolean;
    isMinimized(): boolean;
    restore(): void;
    close(): void;
    destroy(): void;
    isDestroyed(): boolean;
    loadURL(url: string, options?: any): Promise<void>;
    loadFile(filePath: string, options?: any): Promise<void>;
    on(
      event: "close" | "closed" | "ready-to-show" | "focus" | "blur" | string,
      listener: (...args: any[]) => void
    ): this;
  }

  export interface MenuItemConstructorOptions {
    label?: string;
    type?: "normal" | "separator" | "submenu" | "checkbox" | "radio";
    enabled?: boolean;
    visible?: boolean;
    checked?: boolean;
    accelerator?: string;
    click?: (
      menuItem: MenuItem,
      browserWindow: BrowserWindow | undefined,
      event: any
    ) => void;
    submenu?: MenuItemConstructorOptions[] | Menu;
  }

  export class MenuItem {
    constructor(options: MenuItemConstructorOptions);
    label: string;
    enabled: boolean;
    visible: boolean;
    checked: boolean;
  }

  export class Menu {
    static buildFromTemplate(template: MenuItemConstructorOptions[]): Menu;
    static setApplicationMenu(menu: Menu | null): void;
    items: MenuItem[];
  }

  export interface NativeImage {
    resize(options: {
      width?: number;
      height?: number;
      quality?: "good" | "better" | "best";
    }): NativeImage;
    setTemplateImage(isTemplateImage: boolean): void;
    isTemplateImage(): boolean;
    isEmpty(): boolean;
    toPNG(): Buffer;
  }

  export class Tray extends EventEmitter {
    constructor(image: NativeImage | string);
    setToolTip(toolTip: string): void;
    setContextMenu(menu: Menu | null): void;
    setImage(image: NativeImage | string): void;
    setIgnoreDoubleClickEvents(ignore: boolean): void;
    destroy(): void;
    isDestroyed(): boolean;
    on(
      event: "click" | "double-click" | "right-click",
      listener: (...args: any[]) => void
    ): this;
  }

  export interface GlobalShortcut {
    register(accelerator: string, callback: () => void): boolean;
    isRegistered(accelerator: string): boolean;
    unregister(accelerator: string): void;
    unregisterAll(): void;
  }

  export interface IpcMain extends EventEmitter {
    handle(
      channel: string,
      listener: (event: any, ...args: any[]) => Promise<any> | any
    ): void;
    handleOnce(
      channel: string,
      listener: (event: any, ...args: any[]) => Promise<any> | any
    ): void;
    removeHandler(channel: string): void;
  }

  export interface IpcRenderer extends EventEmitter {
    invoke(channel: string, ...args: any[]): Promise<any>;
    send(channel: string, ...args: any[]): void;
    on(channel: string, listener: (event: any, ...args: any[]) => void): this;
    removeListener(
      channel: string,
      listener: (event: any, ...args: any[]) => void
    ): this;
  }

  export interface ContextBridge {
    exposeInMainWorld(apiKey: string, api: any): void;
  }

  export interface Shell {
    openExternal(url: string): Promise<void>;
  }

  export interface Clipboard {
    writeText(text: string, type?: string): void;
    readText(type?: string): string;
  }

  export const app: App;
  export const nativeImage: {
    createFromPath(path: string): NativeImage;
    createFromBuffer(buffer: Buffer, options?: any): NativeImage;
    createEmpty(): NativeImage;
  };
  export const globalShortcut: GlobalShortcut;
  export const ipcMain: IpcMain;
  export const ipcRenderer: IpcRenderer;
  export const contextBridge: ContextBridge;
  export const shell: Shell;
  export const clipboard: Clipboard;
}
