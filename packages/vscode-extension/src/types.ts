export interface PointrSource {
  file: string;
  line?: number;
  column?: number;
  snippet?: string;
}

export interface PointrDOM {
  tagName: string;
  cssSelector: string;
  xpath?: string;
  attributes?: Record<string, string>;
  textContent?: string;
}

export interface PointrStyles {
  computed?: Record<string, string>;
  designTokens?: Record<string, string>;
  tailwindClasses?: string[];
}

export interface PointrComponentNode {
  name: string;
  file?: string;
  line?: number;
  props?: Record<string, any>;
}

export interface PointrPayload {
  source: PointrSource;
  dom: PointrDOM;
  styles?: PointrStyles;
  componentTree?: PointrComponentNode[];
  screenshot?: {
    base64?: string;
    width?: number;
    height?: number;
  };
  meta?: {
    timestamp?: string;
    url?: string;
    intent?: string;
    pointrVersion?: string;
  };
  markdown?: string;
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface ExtensionConfig {
  serverPort: number;
  autoOpen: boolean;
  highlightDuration: number;
}
