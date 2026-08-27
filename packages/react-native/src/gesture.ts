import {
  PanResponder,
  PanResponderInstance,
  GestureResponderEvent,
  DevSettings,
} from "react-native";
import type { GestureDetectorOptions } from "./types";

/**
 * Creates a React Native PanResponder that activates Pointr inspection mode
 * when the user holds two fingers on the screen for at least holdThresholdMs (default 500ms).
 */
export function createMultiTouchDetector(
  options: GestureDetectorOptions
): PanResponderInstance {
  const { onActivate, holdThresholdMs = 500 } = options;
  let timer: any = null;

  const clearLongPressTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return PanResponder.create({
    onStartShouldSetPanResponderCapture: (evt: GestureResponderEvent) => {
      const touches = evt.nativeEvent.touches
        ? evt.nativeEvent.touches.length
        : 0;
      if (touches >= 2) {
        clearLongPressTimer();
        timer = setTimeout(() => {
          onActivate();
          timer = null;
        }, holdThresholdMs);
      }
      // Never block children by default; allow touch event propagation
      return false;
    },
    onMoveShouldSetPanResponderCapture: (evt: GestureResponderEvent) => {
      const touches = evt.nativeEvent.touches
        ? evt.nativeEvent.touches.length
        : 0;
      if (touches < 2) {
        clearLongPressTimer();
      }
      return false;
    },
    onPanResponderRelease: () => {
      clearLongPressTimer();
    },
    onPanResponderTerminate: () => {
      clearLongPressTimer();
    },
    onPanResponderTerminationRequest: () => true,
  });
}

/**
 * Hooks into React Native DevSettings (available in development mode)
 * to allow toggling the Pointr Inspector from the developer shake menu.
 */
export function setupShakeDetector(onActivate: () => void): () => void {
  const isDev =
    typeof __DEV__ !== "undefined"
      ? __DEV__
      : process.env.NODE_ENV !== "production";

  if (isDev && DevSettings && typeof DevSettings.addMenuItem === "function") {
    try {
      DevSettings.addMenuItem("🎯 Toggle Pointr Inspector", () => {
        onActivate();
      });
    } catch {
      // DevSettings menu items might not be supported in some environments
    }
  }

  // Return teardown function
  return () => {
    // Cleanup if supported
  };
}
