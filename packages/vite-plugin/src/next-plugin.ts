/// <reference types="node" />
// @ts-nocheck
import path from "path";
import fs from "fs";

export function withPointr(nextConfig: any = {}) {
  return (phase: string, context: any) => {
    const config =
      typeof nextConfig === "function"
        ? nextConfig(phase, context)
        : nextConfig;

    if (
      phase !== "phase-development-server" &&
      process.env.NODE_ENV !== "development"
    ) {
      return config;
    }

    return {
      ...config,
      webpack(webpackConfig: any, options: any) {
        const { dev, isServer } = options;

        if (dev) {
          // Add the Webpack rule for JSX/TSX
          let loaderPath = "";
          try {
            // In CJS, __dirname is available. In ESM, tsup might shim it or we can fallback.
            loaderPath = require.resolve("./webpack-loader");
          } catch (e) {
            // Fallback for some execution environments
            loaderPath = path.resolve(__dirname, "webpack-loader.js");
          }

          webpackConfig.module.rules.push({
            test: /\.[jt]sx?$/,
            exclude: /node_modules/,
            use: [
              {
                loader: loaderPath,
              },
            ],
          });
        }

        if (dev && !isServer) {
          const originalEntry = webpackConfig.entry;
          webpackConfig.entry = async () => {
            const entries =
              typeof originalEntry === "function"
                ? await originalEntry()
                : originalEntry;

            // Try to resolve the overlay
            let overlayPath = "";
            try {
              // Usually the user has @pointr/overlay installed
              overlayPath = require.resolve("@pointr/overlay");
            } catch (e) {
              // Fallback to monorepo structure for local testing
              const root = process.cwd();
              const localPath = path.resolve(
                root,
                "packages/overlay/dist/index.iife.js"
              );
              if (fs.existsSync(localPath)) {
                overlayPath = localPath;
              } else {
                const localPath2 = path.resolve(
                  __dirname,
                  "../../overlay/dist/index.iife.js"
                );
                if (fs.existsSync(localPath2)) {
                  overlayPath = localPath2;
                }
              }
            }

            if (overlayPath) {
              if (
                entries["main-app"] &&
                !entries["main-app"].includes(overlayPath)
              ) {
                entries["main-app"].unshift(overlayPath);
              }
              if (entries["main"] && !entries["main"].includes(overlayPath)) {
                entries["main"].unshift(overlayPath);
              }
            }

            return entries;
          };
        }

        if (typeof config.webpack === "function") {
          return config.webpack(webpackConfig, options);
        }

        return webpackConfig;
      },
    };
  };
}

export default withPointr;
