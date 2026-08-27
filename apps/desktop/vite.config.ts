import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "node20",
    sourcemap: true,
    lib: {
      entry: {
        "main/index": path.resolve(__dirname, "src/main/index.ts"),
        "preload/index": path.resolve(__dirname, "src/preload/index.ts"),
      },
      formats: ["cjs"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        "electron",
        "child_process",
        "net",
        "http",
        "https",
        "events",
        "path",
        "fs",
        "os",
        "url",
        "crypto",
        "stream",
        "@pointr/mcp-server",
        "electron-squirrel-startup",
      ],
      output: {
        format: "cjs",
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name].js",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
