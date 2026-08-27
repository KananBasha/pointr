import { describe, it, expect, vi } from "vitest";
import { StyleSheet, Dimensions, Platform } from "react-native";
import {
  packageMobileContext,
  packMobileContext,
  formatMobileMarkdown,
} from "../src/packager";

vi.mock("react-native", () => {
  return {
    Platform: {
      OS: "ios",
      Version: "17.2",
    },
    Dimensions: {
      get: vi.fn((key: string) => {
        if (key === "window") return { width: 390, height: 844 };
        if (key === "screen") return { width: 390, height: 844, scale: 3 };
        return { width: 0, height: 0 };
      }),
    },
    StyleSheet: {
      flatten: vi.fn((style: any) => {
        if (!style) return {};
        if (Array.isArray(style)) {
          return Object.assign(
            {},
            ...style.map((s) => (s ? (typeof s === "object" ? s : {}) : {}))
          );
        }
        if (typeof style === "object") return style;
        return {};
      }),
    },
  };
});

describe("Pointr React Native Context Packager", () => {
  it("correctly flattens complex StyleSheet arrays and objects", () => {
    const baseStyle = { backgroundColor: "#18181B", padding: 16 };
    const activeStyle = { borderColor: "#F59E0B", borderWidth: 2 };

    const payload = packageMobileContext({
      source: {
        file: "src/components/PrimaryCard.tsx",
        line: 25,
        column: 4,
        component: "PrimaryCard",
      },
      componentHierarchy: ["App", "HomeScreen", "PrimaryCard"],
      style: [baseStyle, activeStyle],
      bounds: { x: 16, y: 120, width: 358, height: 200 },
      intent: "Make the border rounded and increase padding",
    });

    expect(payload.styles.flattened).toEqual({
      backgroundColor: "#18181B",
      padding: 16,
      borderColor: "#F59E0B",
      borderWidth: 2,
    });
    expect(payload.styles.layout).toEqual({
      width: 358,
      height: 200,
      top: 120,
      left: 16,
    });
  });

  it("generates rich markdown output formatted for AI agents", () => {
    const payload = packageMobileContext({
      source: {
        file: "src/components/Button.tsx",
        line: 42,
        column: 8,
        component: "CustomButton",
      },
      componentHierarchy: ["App", "Screen", "CustomButton"],
      style: { backgroundColor: "#F59E0B", height: 48 },
      bounds: { x: 20, y: 300, width: 350, height: 48 },
      intent: "Change button label color to black and add elevation",
    });

    expect(payload.markdown).toContain(
      "# 🎯 Pointr Mobile Target: <CustomButton>"
    );
    expect(payload.markdown).toContain("src/components/Button.tsx:42:8");
    expect(payload.markdown).toContain("ios (v17.2)");
    expect(payload.markdown).toContain("390x844 (scale: 3x)");
    expect(payload.markdown).toContain("- `<CustomButton>`");
    expect(payload.markdown).toContain('"backgroundColor": "#F59E0B"');
    expect(payload.markdown).toContain("Coordinates: x=20, y=300");
    expect(payload.markdown).toContain("Dimensions: 350px × 48px");
    expect(payload.markdown).toContain(
      "Change button label color to black and add elevation"
    );
  });

  it("includes dom compatibility object for MCP server receiver", () => {
    const payload = packageMobileContext({
      source: {
        file: "src/App.tsx",
        line: 10,
        column: 2,
        component: "RootView",
      },
      bounds: { x: 0, y: 0, width: 390, height: 844 },
    });

    expect(payload.dom).toBeDefined();
    expect(payload.dom?.tagName).toBe("RootView");
    expect(payload.dom?.cssSelector).toBe("RootView");
    expect(payload.dom?.xpath).toBe("//RootView");
  });

  it("packMobileContext works identically as an alias", () => {
    const payload = packMobileContext({
      source: {
        file: "src/Header.tsx",
        line: 12,
        column: 4,
        component: "Header",
      },
      bounds: { x: 0, y: 0, width: 390, height: 60 },
    });

    expect(payload.platform).toBe("mobile");
    expect(payload.source.component).toBe("Header");
  });
});
