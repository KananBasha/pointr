import { NativeModules, Platform } from "react-native";
import type { PointrMobilePayload, NetworkConfig } from "./types";

/**
 * Resolves the LAN or loopback IP address of the developer machine running the Pointr MCP Server.
 * Supports physical iOS/Android devices over LAN, Android emulators (10.0.2.2), and iOS simulators (127.0.0.1).
 */
export function resolveHostMachineIp(overrideHost?: string): string {
  if (overrideHost) {
    return overrideHost;
  }

  // 1. Extract IP from Metro/Expo bundler scriptURL if available
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    // Matches http://192.168.1.50:8081/..., exp://192.168.1.50:8081, etc.
    const match = scriptURL.match(/^(?:https?|exp):\/\/([^:/]+)(?::\d+)?\//);
    if (match && match[1]) {
      const extractedHost = match[1];
      // If extracted host is a real LAN IP (not localhost), return it directly
      if (extractedHost !== "localhost" && extractedHost !== "127.0.0.1") {
        return extractedHost;
      }
    }
  }

  // 2. Check Android Emulator default loopback alias
  if (
    Platform.OS === "android" &&
    (NativeModules?.PlatformConstants?.Model?.toLowerCase().includes("sdk") ||
      NativeModules?.PlatformConstants?.Model?.toLowerCase().includes(
        "emulator"
      ) ||
      NativeModules?.PlatformConstants?.Fingerprint?.includes("generic"))
  ) {
    return "10.0.2.2";
  }

  // 3. Check iOS Simulator / Web / Desktop
  if (
    Platform.OS === "web" ||
    (Platform.OS === "ios" &&
      (NativeModules?.PlatformConstants?.isTesting ||
        NativeModules?.PlatformConstants?.isSimulator))
  ) {
    return "127.0.0.1";
  }

  // If scriptURL matched localhost, return 127.0.0.1
  if (scriptURL) {
    const match = scriptURL.match(/^(?:https?|exp):\/\/([^:/]+)(?::\d+)?\//);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Default fallback
  return "127.0.0.1";
}

/**
 * Dispatches the captured mobile context payload to the Pointr MCP server.
 * Automatically scans standard port range 3333 -> 3340.
 */
export async function dispatchMobilePayload(
  payload: PointrMobilePayload,
  config: NetworkConfig = {}
): Promise<{ success: boolean; port: number; error?: string }> {
  const host = resolveHostMachineIp(config.host);
  const startPort = config.port || 3333;
  const maxPort = Math.max(startPort, 3340);
  const timeout = config.timeoutMs || 3000;

  for (let port = startPort; port <= maxPort; port++) {
    const endpoint = `http://${host}:${port}/context`;
    let timeoutId: any = null;

    try {
      const controller =
        typeof AbortController !== "undefined" ? new AbortController() : null;
      if (controller) {
        timeoutId = setTimeout(() => controller.abort(), timeout);
      }

      const requestOptions: any = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      };

      if (controller) {
        requestOptions.signal = controller.signal;
      }

      const response = await fetch(endpoint, requestOptions);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (response.ok) {
        return { success: true, port };
      }
    } catch {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Continue searching next port
      continue;
    }
  }

  return {
    success: false,
    port: startPort,
    error: `Could not connect to Pointr MCP Server on ${host}:${startPort}-${maxPort}. Ensure the Pointr MCP server is running.`,
  };
}

/**
 * Convenience helper to send mobile payload and return boolean success status.
 */
export async function sendMobilePayload(
  payload: PointrMobilePayload,
  port?: number
): Promise<boolean> {
  const result = await dispatchMobilePayload(payload, { port });
  return result.success;
}
