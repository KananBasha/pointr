# API Reference

Detailed technical reference for the four packages in the Pointr monorepo.

## `@pointr/vite-plugin`

A Vite plugin that parses JSX and injects source location data into DOM elements.

### `pointr()`

The primary export for Vite configurations.

```ts
import { pointr } from '@pointr/vite-plugin';

export default {
  plugins: [pointr()]
}
```
Currently takes no configuration object (planned for `v0.1.0`).

### `withPointr(nextConfig)`

A wrapper intended for Next.js support (future implementation).

### `data-pointr-source` Attribute

The plugin injects this attribute into all JSX elements during development.

**Format:** `file:line:column`
**Example:** `data-pointr-source="src/components/Button.tsx:42:5"`

---

## `@pointr/overlay`

An IIFE-bundled browser script injected by the Vite plugin to handle user interaction (Alt+hover/click).

### `initPointr()`

Initializes the overlay. Automatically called upon script injection.

### `window.__POINTR_CONFIG__`

Global configuration object for the overlay.

| Option | Type | Default | Description |
|---|---|---|---|
| `disabled` | `boolean` | `false` | Completely disables the overlay interaction |
| `mcpPort` | `number` | `3333` | Target port for the MCP server POST requests |
| `hotkey` | `string` | `'Alt'` | Key required to activate the element inspector |

---

## `@pointr/mcp-server`

An Express-based server exposing the Model Context Protocol (MCP) to AI agents.

### Tools

- **`get_selected_element_context`**: The primary MCP tool exposed to the agent. Returns the latest contextual payload captured from the browser.

### Endpoints

- **`POST /context`**: Used by `@pointr/overlay` to send a new `PointrPayload`.
- **`GET /context/latest`**: Alternative endpoint to fetch the latest context without MCP.

### Port Auto-Discovery

The server attempts to bind to port `3333`. If it encounters an `EADDRINUSE` error, it increments the port up to `3340` before failing.

---

## `@pointr/context-packager`

Utility package for extracting and serializing browser context into the `PointrPayload`.

### `packContext(element, intent)`

Main function called by the overlay upon clicking an element.

**Signature:** `packContext(element: HTMLElement, intent?: string): Promise<PointrPayload>`

### `PointrPayload` Interface

The comprehensive payload structure sent to the MCP server.

```ts
interface PointrPayload {
  source: { 
    file: string; 
    line: number; 
    column: number; 
    snippet: string; 
  };
  componentTree: Array<{ 
    name: string; 
    props: Record<string, any>; 
    depth: number; 
  }>;
  dom: { 
    tagName: string; 
    cssSelector: string; 
    xpath: string; 
    attributes: Record<string, string>; 
    textContent: string; 
  };
  styles: { 
    computed: Record<string, string>; 
    designTokens: Record<string, string>; 
    tailwindClasses: string[]; 
  };
  screenshot: { 
    base64: string; 
    width: number; 
    height: number; 
  };
  meta: { 
    timestamp: number; 
    url: string; 
    intent?: string; 
    pointrVersion: string; 
  };
  markdown: string; // Pre-formatted markdown for AI agent consumption
}
```
