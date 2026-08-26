# Pointr

> Point at anything in your UI. Your AI agent knows exactly what you mean.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/KananBasha/pointr/actions/workflows/ci.yml/badge.svg)](https://github.com/KananBasha/pointr/actions/workflows/ci.yml)
[![npm coming soon](https://img.shields.io/badge/npm-coming%20soon-orange)](https://github.com/KananBasha/pointr)

Pointr eliminates the **"the button on the top left with X written"** problem.

Hold `Alt`, click any element in your running app — Pointr instantly sends your AI coding agent the exact file, line, component tree, props, computed styles, and a screenshot. No more describing UI in words.

## How It Works

```
1. Install @pointr/vite-plugin in your project
2. Run npx @pointr/mcp-server
3. Configure your agent (Claude Code, Cursor, Windsurf) with the MCP URL
4. Hold Alt + click any element in your browser
5. Type what you want to change → agent receives full context instantly
```

## Quick Start

> **Note:** Packages are not yet published to npm. Clone the repo and use workspace references for now. npm publish coming soon.

```bash
# 1. Clone the repo
git clone https://github.com/KananBasha/pointr
cd pointr && pnpm install && pnpm build

# 2. Link @pointr/vite-plugin into your project
# (add to your project's package.json devDependencies with a file: reference)
# "devDependencies": { "@pointr/vite-plugin": "file:../pointr/packages/vite-plugin" }

# 3. Add to vite.config.ts
import { pointr } from '@pointr/vite-plugin'
export default defineConfig({ plugins: [pointr()] })

# 4. Start the local MCP server
node ../pointr/packages/mcp-server/dist/cli.js

# 5. Configure your agent
```

```json
// Claude Code — .claude/mcp.json
{ "mcpServers": { "pointr": { "url": "http://localhost:3333/mcp" } } }

// Cursor — .cursor/mcp.json
{ "mcpServers": { "pointr": { "url": "http://localhost:3333/mcp" } } }

// Windsurf — .windsurf/mcp.json
{ "mcpServers": { "pointr": { "url": "http://localhost:3333/mcp" } } }
```

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`@pointr/vite-plugin`](packages/vite-plugin) | Vite/Next.js plugin — injects source metadata at build time | ![version](https://img.shields.io/badge/version-0.1.0-blue) |
| [`@pointr/overlay`](packages/overlay) | In-browser overlay — Alt+Click element picker | ![version](https://img.shields.io/badge/version-0.1.0-blue) |
| [`@pointr/mcp-server`](packages/mcp-server) | Local MCP server — exposes context to AI agents | ![version](https://img.shields.io/badge/version-0.1.0-blue) |
| [`@pointr/context-packager`](packages/context-packager) | Context assembler — fiber, styles, screenshot | ![version](https://img.shields.io/badge/version-0.1.0-blue) |

## Why Pointr vs Stagewise?

| | Stagewise | **Pointr** |
|---|---|---|
| License | AGPL-3.0 | **MIT** ✅ |
| Protocol | Custom per-editor | **MCP native** |
| Context depth | DOM + component | **Maximum** (fiber, tokens, screenshot, snippet) |
| Architecture | Electron-based | **Lightweight npm plugin** |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All commits must follow [Conventional Commits](https://www.conventionalcommits.org/).

```bash
git clone https://github.com/KananBasha/pointr
cd pointr
pnpm install
pnpm dev
```

## License

MIT © [KananBasha](https://github.com/KananBasha) — see [LICENSE](LICENSE)

---

*Pointr Cloud (team history, Figma sync, analytics) — coming soon at [pointr.dev](https://pointr.dev)*
