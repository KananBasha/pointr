import type React from "react";

declare module "react-native" {
  export interface GestureResponderEvent {
    nativeEvent: {
      changedTouches?: any[];
      identifier?: string;
      locationX?: number;
      locationY?: number;
      pageX?: number;
      pageY?: number;
      target?: string;
      timestamp?: number;
      touches: any[];
    };
  }

  export interface PanResponderCallbacks {
    onStartShouldSetPanResponder?: (
      e: GestureResponderEvent,
      gestureState: any
    ) => boolean;
    onStartShouldSetPanResponderCapture?: (
      e: GestureResponderEvent,
      gestureState: any
    ) => boolean;
    onMoveShouldSetPanResponder?: (
      e: GestureResponderEvent,
      gestureState: any
    ) => boolean;
    onMoveShouldSetPanResponderCapture?: (
      e: GestureResponderEvent,
      gestureState: any
    ) => boolean;
    onPanResponderGrant?: (e: GestureResponderEvent, gestureState: any) => void;
    onPanResponderReject?: (
      e: GestureResponderEvent,
      gestureState: any
    ) => void;
    onPanResponderMove?: (e: GestureResponderEvent, gestureState: any) => void;
    onPanResponderRelease?: (
      e: GestureResponderEvent,
      gestureState: any
    ) => void;
    onPanResponderTerminationRequest?: (
      e: GestureResponderEvent,
      gestureState: any
    ) => boolean;
    onPanResponderTerminate?: (
      e: GestureResponderEvent,
      gestureState: any
    ) => void;
  }

  export interface PanResponderInstance {
    panHandlers: Record<string, any>;
  }

  export const PanResponder: {
    create: (config: PanResponderCallbacks) => PanResponderInstance;
  };

  export interface ScaledSize {
    width: number;
    height: number;
    scale: number;
    fontScale: number;
  }

  export const Dimensions: {
    get: (dim: "window" | "screen") => ScaledSize;
    set: (dims: { [key: string]: any }) => void;
    addEventListener: (
      type: "change",
      handler: (dims: { window: ScaledSize; screen: ScaledSize }) => void
    ) => { remove: () => void };
  };

  export interface PlatformOSType {
    OS: "ios" | "android" | "windows" | "macos" | "web";
    Version: string | number;
    isTV?: boolean;
    isTesting?: boolean;
    select: <T>(specifics: {
      [platform in
        | "ios"
        | "android"
        | "windows"
        | "macos"
        | "web"
        | "default"]?: T;
    }) => T;
  }

  export const Platform: PlatformOSType;

  export const NativeModules: {
    SourceCode?: {
      scriptURL?: string;
    };
    PlatformConstants?: {
      isTesting?: boolean;
      isSimulator?: boolean;
      Model?: string;
      Fingerprint?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };

  export const DevSettings: {
    addMenuItem?: (title: string, handler: () => void) => void;
    reload?: (reason?: string) => void;
  };

  export type ViewStyle = Record<string, any>;
  export type TextStyle = Record<string, any>;
  export type ImageStyle = Record<string, any>;
  export type StyleProp<T> =
    | T
    | Array<T | undefined | null | false>
    | undefined
    | null
    | false;

  export const StyleSheet: {
    create: <T extends Record<string, any>>(styles: T) => T;
    flatten: <T>(style?: StyleProp<T>) => T;
    hairlineWidth: number;
    absoluteFillObject: Record<string, any>;
    absoluteFill: any;
  };

  export const View: React.FC<any>;
  export const Text: React.FC<any>;
  export const Modal: React.FC<any>;
  export const TouchableOpacity: React.FC<any>;
  export const TextInput: React.FC<any>;
  export const ScrollView: React.FC<any>;
  export const ActivityIndicator: React.FC<any>;
  export const SafeAreaView: React.FC<any>;
}

declare global {
  var __DEV__: boolean;
}
