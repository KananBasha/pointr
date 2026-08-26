import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { run, updateViteConfig, updateMcpConfig } from "../src/index.js";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Pointr CLI Init", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "pointr-init-test-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should detect and update vite.config.ts", () => {
    const viteConfigPath = join(testDir, "vite.config.ts");
    writeFileSync(
      viteConfigPath,
      `import { defineConfig } from 'vite';\n\nexport default defineConfig({\n  plugins: []\n});\n`
    );

    run(testDir);

    const updated = readFileSync(viteConfigPath, "utf-8");
    expect(updated).toContain(`import { pointr } from '@pointr/vite-plugin';`);
    expect(updated).toContain(`plugins: [pointr(),`);
  });

  it("should create .cursor/mcp.json and .claude/mcp.json", () => {
    run(testDir);

    const cursorMcp = join(testDir, ".cursor", "mcp.json");
    const claudeMcp = join(testDir, ".claude", "mcp.json");

    expect(existsSync(cursorMcp)).toBe(true);
    expect(existsSync(claudeMcp)).toBe(true);

    const cursorContent = JSON.parse(readFileSync(cursorMcp, "utf-8"));
    expect(cursorContent.mcpServers.pointr.url).toBe(
      "http://localhost:3333/mcp"
    );
  });
});
