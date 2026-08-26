# Getting Started with Pointr

This guide will walk you through setting up Pointr in your project and connecting it to your AI coding agent.

## Prerequisites

- Node.js 18 or newer
- A project using Vite or Next.js (currently focused on Vite)

## Installation

Getting Pointr running involves three steps: installing the Vite plugin, starting the MCP server, and configuring your AI agent.

### Step 1: Install and Configure the Plugin

Install the Vite plugin as a development dependency:

```bash
npm install -D @pointr/vite-plugin
```

Update your `vite.config.ts` (or `.js`):

```ts
import { defineConfig } from 'vite';
import { pointr } from '@pointr/vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    pointr()
  ]
});
```

> [!NOTE]
> The Pointr plugin is `apply: 'serve'` by default. It will not affect your production build.

### Step 2: Start the MCP Server

The MCP server acts as the bridge between your browser and the AI agent.

```bash
npx @pointr/mcp-server
```

> [!TIP]
> The server typically starts on port `3333`. If the port is in use, it will automatically search for the next available port up to `3340`.

### Step 3: Configure Your AI Agent

Add the Pointr MCP server to your agent's configuration.

#### Claude Code
Update `.claude/mcp.json`:
```json
{
  "mcpServers": {
    "pointr": {
      "command": "npx",
      "args": ["-y", "@pointr/mcp-server"]
    }
  }
}
```

#### Cursor
Update `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "pointr": {
      "command": "npx",
      "args": ["-y", "@pointr/mcp-server"]
    }
  }
}
```

#### Windsurf
Update `.windsurf/mcp.json`:
```json
{
  "mcpServers": {
    "pointr": {
      "command": "npx",
      "args": ["-y", "@pointr/mcp-server"]
    }
  }
}
```

## First Usage Walkthrough

1. Start your Vite development server (`npm run dev`).
2. Open your application in the browser. You should see the Pointr overlay active.
3. Hold the `Alt` (or `Option` on macOS) key. As you move your mouse, Pointr highlights UI elements.
4. While holding `Alt`, **click** on an element you want to work on.
5. Pointr captures the component tree, DOM state, styles, and a screenshot, and sends it to the MCP server.
6. Ask your AI agent to "look at the selected element" or "modify the button I just clicked". The agent will call the `get_selected_element_context` tool to retrieve the context.

## Troubleshooting

> [!WARNING]
> **MCP server not started:** If you Alt-click and nothing happens or the console shows a fetch error, ensure the MCP server is running (`npx @pointr/mcp-server`).

> [!WARNING]
> **Overlay not visible:** Ensure the `@pointr/vite-plugin` is included in your Vite config and that you are running in development mode.

> [!NOTE]
> **Port occupied:** The MCP server auto-discovers ports `3333` to `3340`. Ensure at least one of these ports is free.
