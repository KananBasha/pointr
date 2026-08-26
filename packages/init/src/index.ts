import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import picocolors from "picocolors";

export function log(msg: string) {
  console.log(msg);
}

export function updateMcpConfig(cwd: string, filename: string) {
  const dir = join(cwd, dirname(filename));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const filePath = join(cwd, filename);
  let config: any = {};
  if (existsSync(filePath)) {
    try {
      config = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch (e) {
      // ignore
    }
  }

  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers.pointr = {
    url: "http://localhost:3333/mcp",
  };

  writeFileSync(filePath, JSON.stringify(config, null, 2));
  log(picocolors.green(`✅ Updated ${filename}`));
}

export function updateViteConfig(file: string) {
  let content = readFileSync(file, "utf-8");
  if (!content.includes("@pointr/vite-plugin")) {
    content = `import { pointr } from '@pointr/vite-plugin';\n` + content;
  }

  if (!content.includes("pointr()")) {
    content = content.replace(/plugins:\s*\[/, "plugins: [pointr(), ");
  }

  writeFileSync(file, content);
  log(picocolors.green(`✅ Updated ${file}`));
  log(
    picocolors.cyan(
      `👉 Please run: npm install @pointr/vite-plugin @pointr/mcp-server`
    )
  );
}

export function updateNextConfig(file: string) {
  let content = readFileSync(file, "utf-8");
  if (!content.includes("withPointr")) {
    if (content.includes("export default nextConfig")) {
      content = content.replace(
        /export default nextConfig/g,
        `import { withPointr } from '@pointr/next-plugin';\nexport default withPointr(nextConfig)`
      );
    } else if (content.includes("module.exports = nextConfig")) {
      content = content.replace(
        /module\.exports = nextConfig/g,
        `const { withPointr } = require('@pointr/next-plugin');\nmodule.exports = withPointr(nextConfig)`
      );
    } else {
      log(
        picocolors.yellow(
          `⚠️ Could not automatically modify Next.js config. Please wrap your config with withPointr.`
        )
      );
    }
  }
  writeFileSync(file, content);
  log(picocolors.green(`✅ Updated ${file}`));
  log(
    picocolors.cyan(
      `👉 Please run: npm install @pointr/next-plugin @pointr/mcp-server`
    )
  );
}

export function run(cwd = process.cwd()) {
  log(
    picocolors.blue(
      picocolors.bold("🎯 Initializing Pointr in your project...")
    )
  );

  const viteConfigs = ["vite.config.ts", "vite.config.js"];
  const nextConfigs = ["next.config.js", "next.config.mjs", "next.config.ts"];

  let viteFile = viteConfigs.find((f) => existsSync(join(cwd, f)));
  let nextFile = nextConfigs.find((f) => existsSync(join(cwd, f)));

  if (viteFile) {
    updateViteConfig(join(cwd, viteFile));
  } else if (nextFile) {
    updateNextConfig(join(cwd, nextFile));
  } else {
    log(picocolors.yellow(`⚠️ No Vite or Next.js configuration found.`));
  }

  updateMcpConfig(cwd, ".claude/mcp.json");
  updateMcpConfig(cwd, ".cursor/mcp.json");

  log(picocolors.green("✨ Done!"));
}
