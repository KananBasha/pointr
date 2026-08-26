import { Plugin } from "vite";
import {
  transform,
  transformJSX,
  transformVue,
  transformSvelte,
} from "./transform";
import path from "path";
import fs from "fs";

export function pointr(): Plugin {
  let isServe = false;
  let rootDir = process.cwd();

  return {
    name: "vite-plugin-pointr",
    enforce: "pre",

    configResolved(config) {
      isServe = config.command === "serve";
      if (config.root) {
        rootDir = config.root;
      }
    },

    transform(code, id) {
      if (!isServe) return null;
      return transform(code, id, rootDir);
    },

    transformIndexHtml(html) {
      if (!isServe) return html;
      return [
        {
          tag: "script",
          attrs: { src: "/@pointr/overlay.js", type: "module" },
          injectTo: "body-prepend",
        },
      ];
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/@pointr/overlay.js") {
          // Serve the IIFE overlay
          try {
            // Find overlay package
            const root = rootDir || process.cwd();
            const overlayPath = path.resolve(
              root,
              "packages/overlay/dist/index.iife.js"
            );
            if (fs.existsSync(overlayPath)) {
              res.setHeader("Content-Type", "application/javascript");
              res.end(fs.readFileSync(overlayPath));
              return;
            } else {
              // fallback if not monorepo
              const localOverlay = path.resolve(
                __dirname,
                "../../overlay/dist/index.iife.js"
              );
              if (fs.existsSync(localOverlay)) {
                res.setHeader("Content-Type", "application/javascript");
                res.end(fs.readFileSync(localOverlay));
                return;
              }
            }
          } catch (e) {
            console.error("[Pointr] Error serving overlay:", e);
          }
        }
        next();
      });
    },
  };
}

export { transform, transformJSX, transformVue, transformSvelte };
export default pointr;
