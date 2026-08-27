import type React from "react";

/**
 * Exact source code coordinates captured by Babel AST plugin.
 */
export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  component?: string | undefined;
  snippet?: string | undefined;
}

/**
 * Metadata for a tagged React Native JSX element.
 */
export interface PointrSourceMeta {
  file: string;
  line: number;
  column: number;
  component: string;
  snippet?: string | undefined;
}

/**
 * Component representation in native view hierarchy.
 */
export interface MobileComponentNode {
  componentName: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  hierarchy: string[];
  props?: Record<string, unknown> | undefined;
}

/**
 * Device and runtime environment metrics.
 */
export interface MobileDeviceInfo {
  os: string;
  version: string;
  isTesting?: boolean | undefined;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
}

/**
 * Extracted and flattened StyleSheet rules.
 */
export interface MobileStyles {
  flattened: Record<string, string | number>;
  layout: {
    width: number;
    height: number;
    top: number;
    left: number;
  };
}

/**
 * Metadata accompanying a mobile inspection payload.
 */
export interface MobilePayloadMeta {
  timestamp: string;
  intent?: string | undefined;
  pointrVersion: string;
}

/**
 * Complete payload dispatched to the Pointr Local MCP server.
 */
export interface PointrMobilePayload {
  source: {
    file: string;
    line: number;
    column: number;
    component?: string | undefined;
    snippet?: string | undefined;
  };
  platform: "mobile";
  device: MobileDeviceInfo;
  nativeNode: MobileComponentNode;
  styles: MobileStyles;
  meta: MobilePayloadMeta;
  markdown: string;
  /**
   * Compatibility field for Pointr MCP server receiver
   */
  dom?:
    | {
        tagName: string;
        cssSelector: string;
        xpath: string;
        attributes: Record<string, string>;
        textContent: string;
      }
    | undefined;
}

/**
 * Configuration options for LAN host discovery and network transport.
 */
export interface NetworkConfig {
  host?: string | undefined;
  port?: number | undefined;
  timeoutMs?: number | undefined;
}

/**
 * Options for multi-touch long press activation detector.
 */
export interface GestureDetectorOptions {
  onActivate: () => void;
  holdThresholdMs?: number | undefined;
}

/**
 * Props for the root PointrOverlay component.
 */
export interface PointrOverlayProps {
  children: React.ReactNode;
  enabled?: boolean | undefined;
  host?: string | undefined;
  port?: number | undefined;
  quickChips?: string[] | undefined;
}
