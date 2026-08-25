# Pointr

> Point at anything in your UI. Your AI agent knows exactly what you mean.

[![npm](https://img.shields.io/npm/v/@pointr/vite-plugin?label=%40pointr%2Fvite-plugin)](https://npmjs.com/package/@pointr/vite-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/KananBasha/pointr/actions/workflows/ci.yml/badge.svg)](https://github.com/KananBasha/pointr/actions/workflows/ci.yml)

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

```bash
# 1. Install the Vite plugin
npm install -D @pointr/vite-plugin

# 2. Add to vite.config.ts
import { pointr } from '@pointr/vite-plugin'
export default defineConfig({ plugins: [pointr()] })

# 3. Start the local MCP server
npx @pointr/mcp-server

# 4. Configure your agent
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
| [`@pointr/vite-plugin`](packages/vite-plugin) | Vite/Next.js plugin — injects source metadata at build time | [![npm](https://img.shields.io/npm/v/@pointr/vite-plugin)](https://npmjs.com/package/@pointr/vite-plugin) |
| [`@pointr/overlay`](packages/overlay) | In-browser overlay — Alt+Click element picker | [![npm](https://img.shields.io/npm/v/@pointr/overlay)](https://npmjs.com/package/@pointr/overlay) |
| [`@pointr/mcp-server`](packages/mcp-server) | Local MCP server — exposes context to AI agents | [![npm](https://img.shields.io/npm/v/@pointr/mcp-server)](https://npmjs.com/package/@pointr/mcp-server) |
| [`@pointr/context-packager`](packages/context-packager) | Context assembler — fiber, styles, screenshot | [![npm](https://img.shields.io/npm/v/@pointr/context-packager)](https://npmjs.com/package/@pointr/context-packager) |

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
