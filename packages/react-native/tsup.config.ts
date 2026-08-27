import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "babel-plugin": "src/babel-plugin.ts",
    overlay: "src/overlay.tsx",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    "react",
    "react-native",
    "@babel/core",
    "@babel/types",
    "@babel/traverse",
    "@babel/parser",
  ],
});
