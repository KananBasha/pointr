import { describe, it, expect, vi } from "vitest";
import { withPointr } from "../src/next-plugin";
const PHASE_DEVELOPMENT_SERVER = "phase-development-server";
const PHASE_PRODUCTION_BUILD = "phase-production-build";

// Mock fs and path if necessary, but we can just test the config structure
describe("withPointr Next.js plugin", () => {
  it("should return original config in production phase", () => {
    const originalConfig = { reactStrictMode: true };
    const plugin = withPointr(originalConfig);
    const config = plugin(PHASE_PRODUCTION_BUILD, { defaultConfig: {} });

    expect(config).toEqual(originalConfig);
  });

  it("should return original config if NODE_ENV is production and phase is undefined", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const originalConfig = { reactStrictMode: true };
    const plugin = withPointr(originalConfig);
    const config = plugin("some-phase", { defaultConfig: {} });

    expect(config).toEqual(originalConfig);
    process.env.NODE_ENV = originalEnv;
  });

  it("should inject webpack loader and entry in development mode", async () => {
    const originalConfig = {
      reactStrictMode: true,
      webpack: vi.fn((config) => config),
    };

    const plugin = withPointr(originalConfig);
    const config = plugin(PHASE_DEVELOPMENT_SERVER, { defaultConfig: {} });

    expect(config.reactStrictMode).toBe(true);
    expect(typeof config.webpack).toBe("function");

    const webpackConfig = {
      module: { rules: [] },
      entry: async () => ({
        "main-app": ["app-entry.js"],
        main: ["pages-entry.js"],
      }),
    };

    const newWebpackConfig = config.webpack(webpackConfig, {
      dev: true,
      isServer: false,
    });

    // Check loader
    expect(newWebpackConfig.module.rules).toHaveLength(1);
    expect(newWebpackConfig.module.rules[0].test.toString()).toBe(
      "/\\.[jt]sx?$/"
    );

    // Check entry injection
    expect(typeof newWebpackConfig.entry).toBe("function");
    const entries = await newWebpackConfig.entry();

    expect(entries["main-app"][0]).toMatch(/index\.iife\.js|@pointr\/overlay/);
    expect(entries["main"][0]).toMatch(/index\.iife\.js|@pointr\/overlay/);

    expect(originalConfig.webpack).toHaveBeenCalled();
  });

  it("should not inject entry for server in development", () => {
    const originalConfig = {};
    const plugin = withPointr(originalConfig);
    const config = plugin(PHASE_DEVELOPMENT_SERVER, { defaultConfig: {} });

    const webpackConfig = {
      module: { rules: [] },
      entry: () => ({ "main-app": ["app-entry.js"] }),
    };

    const newWebpackConfig = config.webpack(webpackConfig, {
      dev: true,
      isServer: true,
    });

    // Loader should be injected
    expect(newWebpackConfig.module.rules).toHaveLength(1);

    // Entry should remain original (not overwritten to an async function injecting overlay)
    expect(newWebpackConfig.entry).toBe(webpackConfig.entry);
  });
});
