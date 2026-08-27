import { PointrDesktopAPI } from "./index";

declare global {
  interface Window {
    pointrDesktop?: PointrDesktopAPI | undefined;
  }
}

export {};
