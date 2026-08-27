import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NativeModules, Platform } from "react-native";
import {
  resolveHostMachineIp,
  dispatchMobilePayload,
  sendMobilePayload,
} from "../src/network";
import type { PointrMobilePayload } from "../src/types";

vi.mock("react-native", () => {
  return {
    Platform: {
      OS: "ios",
      Version: "17.4",
      isTesting: false,
      isSimulator: false,
    },
    NativeModules: {
      SourceCode: {},
      PlatformConstants: {},
    },
  };
});

const mockPayload: PointrMobilePayload = {
  source: {
    file: "src/Button.tsx",
    line: 42,
    column: 8,
    snippet: "<Button />",
  },
  platform: "mobile",
  device: {
    os: "ios",
    version: "17.4",
    isTesting: true,
    screenWidth: 390,
    screenHeight: 844,
    pixelRatio: 3,
  },
  nativeNode: {
    componentName: "Button",
    bounds: { x: 20, y: 100, width: 350, height: 48 },
    hierarchy: ["App", "Screen", "Button"],
  },
  styles: {
    flattened: { backgroundColor: "#F59E0B" },
    layout: { width: 350, height: 48, top: 100, left: 20 },
  },
  meta: {
    timestamp: "2026-08-27T18:00:00.000Z",
    intent: "Fix button border",
    pointrVersion: "0.1.0-rn",
  },
  markdown: "# Pointr Mobile Target",
};

describe("Pointr React Native Network Dispatcher", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    (NativeModules as any).SourceCode = {};
    (NativeModules as any).PlatformConstants = {};
    (Platform as any).OS = "ios";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("resolveHostMachineIp", () => {
    it("returns custom override host when explicitly provided", () => {
      const host = resolveHostMachineIp("192.168.1.199");
      expect(host).toBe("192.168.1.199");
    });

    it("extracts LAN host IP from Metro scriptURL on physical device", () => {
      (NativeModules as any).SourceCode = {
        scriptURL:
          "http://192.168.1.50:8081/index.bundle?platform=ios&dev=true",
      };
      const host = resolveHostMachineIp();
      expect(host).toBe("192.168.1.50");
    });

    it("extracts LAN host IP from Expo exp:// scriptURL", () => {
      (NativeModules as any).SourceCode = {
        scriptURL: "exp://10.0.0.15:19000/index.bundle",
      };
      const host = resolveHostMachineIp();
      expect(host).toBe("10.0.0.15");
    });

    it("returns 10.0.2.2 for Android Emulator when Model indicates sdk/emulator", () => {
      (Platform as any).OS = "android";
      (NativeModules as any).PlatformConstants = {
        Model: "sdk_gphone64_arm64",
      };
      const host = resolveHostMachineIp();
      expect(host).toBe("10.0.2.2");
    });

    it("returns 127.0.0.1 for iOS Simulator", () => {
      (Platform as any).OS = "ios";
      (NativeModules as any).PlatformConstants = {
        isSimulator: true,
      };
      const host = resolveHostMachineIp();
      expect(host).toBe("127.0.0.1");
    });

    it("returns 127.0.0.1 for Web runtime", () => {
      (Platform as any).OS = "web";
      const host = resolveHostMachineIp();
      expect(host).toBe("127.0.0.1");
    });
  });

  describe("dispatchMobilePayload & sendMobilePayload", () => {
    it("successfully posts payload when port 3333 is open", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const result = await dispatchMobilePayload(mockPayload, {
        host: "127.0.0.1",
        port: 3333,
      });
      expect(result.success).toBe(true);
      expect(result.port).toBe(3333);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://127.0.0.1:3333/context",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("walks ports and connects to next available port (e.g. 3334)", async () => {
      globalThis.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error("Connection refused on 3333"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      const result = await dispatchMobilePayload(mockPayload, {
        host: "127.0.0.1",
        port: 3333,
      });
      expect(result.success).toBe(true);
      expect(result.port).toBe(3334);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("returns failure when all ports in range 3333-3340 fail", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await dispatchMobilePayload(mockPayload, {
        host: "127.0.0.1",
        port: 3333,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Could not connect to Pointr MCP Server");
    });

    it("sendMobilePayload helper returns boolean status", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const success = await sendMobilePayload(mockPayload, 3333);
      expect(success).toBe(true);
    });
  });
});
