import { Dimensions, Platform, StyleSheet } from "react-native";
import type {
  PointrMobilePayload,
  PointrSourceMeta,
  MobileComponentNode,
  MobileDeviceInfo,
  MobileStyles,
} from "./types";

export interface PackageMobileContextParams {
  source: PointrSourceMeta;
  componentHierarchy?:
    | Array<
        { name: string; props?: Record<string, unknown> | undefined } | string
      >
    | undefined;
  style?: Record<string, unknown> | number | Array<unknown> | null | undefined;
  bounds: { x: number; y: number; width: number; height: number };
  intent?: string | undefined;
  deviceOverride?: Partial<MobileDeviceInfo> | undefined;
}

/**
 * Formats a mobile element capture into a rich Markdown summary tailored for AI coding agents.
 */
export function formatMobileMarkdown(data: {
  source: PointrSourceMeta;
  componentHierarchy: string[];
  flattenedStyle: Record<string, any>;
  bounds: { x: number; y: number; width: number; height: number };
  device: MobileDeviceInfo;
  intent?: string | undefined;
}): string {
  const { source, componentHierarchy, flattenedStyle, bounds, device, intent } =
    data;

  const lines: string[] = [
    `# 🎯 Pointr Mobile Target: <${source.component}>`,
    "",
    `**Source Location**: \`${source.file}:${source.line}:${source.column}\``,
    `**Platform**: \`${device.os} (v${device.version})\` | **Viewport**: \`${device.screenWidth}x${device.screenHeight} (scale: ${device.pixelRatio}x)\``,
    "",
    `## 📱 Component Hierarchy`,
    ...(componentHierarchy.length > 0
      ? componentHierarchy.map((name) => `- \`<${name}>\``)
      : [`- \`<${source.component}>\``]),
    "",
    `## 🎨 Computed StyleSheet`,
    "```json",
    JSON.stringify(flattenedStyle, null, 2),
    "```",
    "",
    `## 📐 Layout Geometry`,
    `- Coordinates: x=${bounds.x}, y=${bounds.y}`,
    `- Dimensions: ${bounds.width}px × ${bounds.height}px`,
  ];

  if (intent && intent.trim()) {
    lines.push("", `## 💬 Developer Intent`, `> "${intent.trim()}"`);
  }

  return lines.join("\n");
}

/**
 * Serializes React Native component metadata, StyleSheet rules, layout geometry,
 * and device information into a standard PointrMobilePayload.
 */
export function packageMobileContext(
  params: PackageMobileContextParams
): PointrMobilePayload {
  const {
    source,
    componentHierarchy = [],
    style,
    bounds,
    intent,
    deviceOverride,
  } = params;

  let windowDims = { width: 375, height: 812 };
  let screenDims = { width: 375, height: 812, scale: 2 };

  try {
    const w = Dimensions.get("window");
    if (w && typeof w.width === "number") {
      windowDims = w;
    }
  } catch {
    // Fallback if Dimensions is not initialized (e.g. test environment)
  }

  try {
    const s = Dimensions.get("screen");
    if (s && typeof s.scale === "number") {
      screenDims = s;
    }
  } catch {
    // Fallback
  }

  // Normalize component hierarchy to string array
  const normalizedHierarchy: string[] = componentHierarchy.map((item) =>
    typeof item === "string" ? item : item.name
  );
  if (normalizedHierarchy.length === 0 && source.component) {
    normalizedHierarchy.push(source.component);
  }

  // Flatten StyleSheet styles safely
  let flattenedStyle: Record<string, any> = {};
  if (style) {
    try {
      flattenedStyle = (StyleSheet.flatten(style) as Record<string, any>) || {};
    } catch {
      flattenedStyle =
        typeof style === "object" && !Array.isArray(style)
          ? (style as any)
          : {};
    }
  }

  const isDev =
    typeof __DEV__ !== "undefined"
      ? __DEV__
      : process.env.NODE_ENV !== "production";

  const device: MobileDeviceInfo = {
    os: Platform.OS || "mobile",
    version: String(Platform.Version || "unknown"),
    isTesting: isDev,
    screenWidth: windowDims.width,
    screenHeight: windowDims.height,
    pixelRatio: screenDims.scale || 1,
    ...deviceOverride,
  };

  const nativeNode: MobileComponentNode = {
    componentName: source.component,
    bounds,
    hierarchy: normalizedHierarchy,
  };

  const styles: MobileStyles = {
    flattened: flattenedStyle,
    layout: {
      width: bounds.width,
      height: bounds.height,
      top: bounds.y,
      left: bounds.x,
    },
  };

  const markdown = formatMobileMarkdown({
    source,
    componentHierarchy: normalizedHierarchy,
    flattenedStyle,
    bounds,
    device,
    intent,
  });

  return {
    source: {
      file: source.file,
      line: source.line,
      column: source.column,
      component: source.component,
      snippet: source.snippet || `<${source.component} />`,
    },
    platform: "mobile",
    device,
    nativeNode,
    styles,
    meta: {
      timestamp: new Date().toISOString(),
      intent: intent || "",
      pointrVersion: "0.1.0-rn",
    },
    markdown,
    // Compatibility bridge for MCP server payload validator
    dom: {
      tagName: source.component,
      cssSelector: source.component,
      xpath: `//${source.component}`,
      attributes: {},
      textContent: intent || "",
    },
  };
}

/**
 * Alias for packageMobileContext.
 */
export const packMobileContext = packageMobileContext;
