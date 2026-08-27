export interface PointrSourceMeta {
  file: string;
  line: number;
  column: number;
  component?: string | undefined;
  snippet?: string | undefined;
}

export interface PointrComponentNode {
  name: string;
  file?: string | undefined;
  props?: Record<string, unknown> | undefined;
  hooks?: string[] | undefined;
}

export interface PointrDomMeta {
  tagName: string;
  cssSelector: string;
  xpath?: string | undefined;
  attributes?: Record<string, string> | undefined;
  textContent?: string | undefined;
}

export interface PointrNativeNode {
  componentName: string;
  bounds?:
    | {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    | undefined;
  hierarchy?: string[] | undefined;
}

export interface PointrDeviceMeta {
  os: string;
  version?: string | undefined;
  isTesting?: boolean | undefined;
  screenWidth?: number | undefined;
  screenHeight?: number | undefined;
  pixelRatio?: number | undefined;
}

export interface PointrStylesMeta {
  computed?: Record<string, string> | undefined;
  designTokens?: Record<string, string> | undefined;
  tailwindClasses?: string[] | undefined;
  flattened?: Record<string, string | number> | undefined;
  layout?:
    | {
        width?: number | undefined;
        height?: number | undefined;
        top?: number | undefined;
        left?: number | undefined;
      }
    | undefined;
}

export interface PointrScreenshotMeta {
  base64?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
}

export interface PointrTargetMeta {
  timestamp: string;
  url?: string | undefined;
  intent?: string | undefined;
  pointrVersion?: string | undefined;
}

export interface PointrTargetPayload {
  id?: string | undefined;
  platform?:
    | "web"
    | "mobile"
    | "ios"
    | "android"
    | "expo"
    | "ide"
    | string
    | undefined;
  source: PointrSourceMeta;
  componentTree?: PointrComponentNode[] | undefined;
  dom?: PointrDomMeta | undefined;
  nativeNode?: PointrNativeNode | undefined;
  device?: PointrDeviceMeta | undefined;
  styles?: PointrStylesMeta | undefined;
  screenshot?: PointrScreenshotMeta | undefined;
  meta?: PointrTargetMeta | undefined;
  markdown: string;
}

export interface ServerStatus {
  running: boolean;
  managed: boolean;
  port: number;
  pid?: number | undefined;
  uptime?: number | undefined;
  payloadCount: number;
}

export interface PointrDesktopAPI {
  getServerStatus: () => Promise<ServerStatus>;
  startServer?: ((port?: number) => Promise<ServerStatus>) | undefined;
  stopServer?: (() => Promise<void>) | undefined;
  restartServer: (port?: number) => Promise<ServerStatus>;
  setPort?: ((port: number) => Promise<ServerStatus>) | undefined;
  getServerLogs: () => Promise<string[]>;
  copyToClipboard: (text: string) => Promise<void>;
  openInEditor: (
    file: string,
    line: number,
    col: number,
    editor?: "vscode" | "cursor"
  ) => Promise<void>;
  onPayloadReceived?:
    | ((callback: (payload: PointrTargetPayload) => void) => () => void)
    | undefined;
  onTargetCaptured?:
    | ((callback: (payload: PointrTargetPayload) => void) => () => void)
    | undefined;
  onServerStatusChanged?:
    | ((callback: (status: ServerStatus) => void) => () => void)
    | undefined;
  onLogMessage: (callback: (log: string) => void) => () => void;
  getAutoOpenInEditor?: (() => Promise<boolean>) | undefined;
  setAutoOpenInEditor?: ((enabled: boolean) => Promise<void>) | undefined;
}
