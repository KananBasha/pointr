import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/index.ts", "src/next-plugin.ts", "src/webpack-loader.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
});
