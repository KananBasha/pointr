// Public API exports for @pointr/react-native

export { PointrOverlay } from "./overlay";
export type { PointrOverlayProps } from "./types";

export { pointrBabelPlugin, withPointrBabel } from "./babel-plugin";
export type { PointrBabelPluginOptions } from "./babel-plugin";

export {
  packageMobileContext,
  packMobileContext,
  formatMobileMarkdown,
} from "./packager";
export type { PackageMobileContextParams } from "./packager";

export {
  resolveHostMachineIp,
  dispatchMobilePayload,
  sendMobilePayload,
} from "./network";

export { createMultiTouchDetector, setupShakeDetector } from "./gesture";

export type {
  SourceLocation,
  PointrSourceMeta,
  MobileComponentNode,
  MobileDeviceInfo,
  MobileStyles,
  MobilePayloadMeta,
  PointrMobilePayload,
  NetworkConfig,
  GestureDetectorOptions,
} from "./types";
