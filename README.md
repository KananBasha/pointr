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

> **Note:** Packages are not yet published to npm. Clone the repo to use locally. npm publish coming soon.

**1. Clone and build**

```bash
git clone https://github.com/KananBasha/pointr
cd pointr && pnpm install && pnpm build
```

**2. Add to your `vite.config.ts`**

```ts
import { pointr } from './path/to/pointr/packages/vite-plugin/dist/index.js'
export default defineConfig({ plugins: [pointr()] })
```

**3. Start the local MCP server**

```bash
node ./path/to/pointr/packages/mcp-server/dist/cli.js
```

**4. Configure your agent**

```json
{ "mcpServers": { "pointr": { "url": "http://localhost:3333/mcp" } } }
```

Save this to `.claude/mcp.json` (Claude Code), `.cursor/mcp.json` (Cursor), or `.windsurf/mcp.json` (Windsurf).

**5. Hold `Alt` and click any element** — your agent receives full context instantly.

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

*Pointr Cloud (team history, Figma sync, analytics) — coming soon.*
