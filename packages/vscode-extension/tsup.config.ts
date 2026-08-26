import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/extension.ts"],
  format: ["cjs"],
  clean: true,
  sourcemap: true,
  external: ["vscode"],
  minify: false,
  dts: false,
});
