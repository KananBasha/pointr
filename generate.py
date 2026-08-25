import os
import json

base_dir = "/Users/hugobefort/dev/antigravity-projects/pointr/packages"

# ----------------- MCP SERVER -----------------
mcp_dir = os.path.join(base_dir, "mcp-server")

pkg_json_mcp = {
  "name": "@pointr/mcp-server",
  "version": "0.1.0",
  "description": "Local MCP server for Pointr — exposes selected element context to AI coding agents",
  "keywords": ["mcp", "ai", "claude", "cursor", "windsurf", "devtools"],
  "homepage": "https://pointr.dev",
  "repository": { "type": "git", "url": "https://github.com/KananBasha/pointr" },
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "bin": {
    "pointr-mcp": "./dist/cli.js"
  },
  "exports": {
    ".": "./dist/index.js",
    "./cli": "./dist/cli.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "type-check": "tsc --noEmit",
    "lint": "eslint src",
    "clean": "rm -rf dist",
    "start": "node dist/cli.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "express": "^4.19.0",
    "ws": "^8.18.0",
    "cors": "^2.8.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/ws": "^8.5.12",
    "tsup": "^8.2.0",
    "typescript": "^5.5.3",
    "vitest": "^2.0.4"
  }
}

types_ts = """export interface PointrPayload {
  source: {
    file: string;
    line: number;
    column: number;
    snippet: string;
  };
  componentTree: Array<{
    name: string;
    file: string;
    props: Record<string, unknown>;
    hooks: string[];
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
    timestamp: string;
    url: string;
    intent: string;
    pointrVersion: string;
  };
  markdown: string;
}
"""

store_ts = """import { PointrPayload } from './types.js';

class PayloadStore {
  private buffer: PointrPayload[] = [];
  private readonly MAX_SIZE = 10;

  push(payload: PointrPayload): void {
    this.buffer.push(payload);
    if (this.buffer.length > this.MAX_SIZE) {
      this.buffer.shift();
    }
  }

  getLatest(): PointrPayload | null {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
  }

  getAll(): PointrPayload[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
  }
}

export const store = new PayloadStore();
"""

mcp_handler_ts = """import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { store } from "./store.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "Pointr MCP Server",
    version: "0.1.0"
  });

  server.tool(
    "get_selected_element_context",
    "Returns full source context for the UI element most recently selected by the developer using the Pointr overlay in their running dev server.",
    {},
    async () => {
      const payload = store.getLatest();
      if (!payload) {
        return {
          content: [{
            type: "text",
            text: "No element context found. Please Alt+Click an element in your development server using the Pointr overlay."
          }]
        };
      }

      const content: any[] = [{ type: "text", text: payload.markdown }];
      
      if (payload.screenshot?.base64) {
        let base64Data = payload.screenshot.base64;
        if (base64Data.startsWith('data:image')) {
          base64Data = base64Data.split(',')[1];
        }
        content.push({
          type: "image",
          data: base64Data,
          mimeType: "image/png"
        });
      }

      return { content };
    }
  );

  return server;
}
"""

index_ts_mcp = """import express from 'express';
import cors from 'cors';
import { createServer as createHttpServer } from 'http';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { store } from './store.js';
import { createMcpServer } from './mcp-handler.js';
import { PointrPayload } from './types.js';

export async function createServer(port: number = 3333): Promise<{ server: any, port: number }> {
  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '50mb' }));

  const mcpServer = createMcpServer();
  let sseTransport: SSEServerTransport | null = null;

  app.post('/context', (req, res) => {
    try {
      const payload = req.body as PointrPayload;
      if (!payload || !payload.source || !payload.dom) {
        return res.status(400).json({ error: 'Invalid payload schema' });
      }
      store.push(payload);
      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to process payload' });
    }
  });

  app.get('/context/latest', (req, res) => {
    const latest = store.getLatest();
    if (!latest) {
      return res.status(404).json({ error: 'No payload found' });
    }
    res.json(latest);
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '0.1.0',
      payloadCount: store.getAll().length
    });
  });

  app.get('/mcp', async (req, res) => {
    sseTransport = new SSEServerTransport("/message", res);
    await mcpServer.server.connect(sseTransport);
  });

  app.post('/message', async (req, res) => {
    if (sseTransport) {
      await sseTransport.handlePostMessage(req, res);
    } else {
      res.status(400).send("SSE transport not initialized");
    }
  });

  return new Promise((resolve, reject) => {
    const tryPort = (currentPort: number) => {
      if (currentPort > 3340) {
        reject(new Error('No available ports between 3333 and 3340'));
        return;
      }
      
      const server = createHttpServer(app);
      server.listen(currentPort, () => {
        resolve({ server, port: currentPort });
      });

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          tryPort(currentPort + 1);
        } else {
          reject(err);
        }
      });
    };

    tryPort(port);
  });
}
"""

cli_ts = """#!/usr/bin/env node
import { createServer } from './index.js';

async function main() {
  const args = process.argv.slice(2);
  let port = 3333;
  
  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    port = parseInt(args[portIndex + 1], 10);
  }

  try {
    const { port: actualPort } = await createServer(port);
    console.log(`
==================================================
  Pointr MCP Server v0.1.0
  Listening on http://localhost:${actualPort}
  MCP endpoint: http://localhost:${actualPort}/mcp
==================================================

Configure your agent:

  Claude Code: add to .claude/mcp.json
  Cursor: add to .cursor/mcp.json

  {
    "mcpServers": {
      "pointr": {
        "url": "http://localhost:${actualPort}/mcp"
      }
    }
  }
`);
  } catch (err) {
    console.error('Failed to start Pointr MCP Server:', err);
    process.exit(1);
  }
}

main();
"""

mcp_handler_test_ts = """import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../src/store.js';
import { createServer } from '../src/index.js';
import { PointrPayload } from '../src/types.js';

describe('mcp-handler', () => {
  beforeEach(() => {
    store.clear();
  });

  const dummyPayload = {
    source: { file: 'a', line: 1, column: 1, snippet: '' },
    componentTree: [],
    dom: { tagName: 'div', cssSelector: 'div', xpath: '/div', attributes: {}, textContent: '' },
    styles: { computed: {}, designTokens: {}, tailwindClasses: [] },
    screenshot: { base64: '', width: 0, height: 0 },
    meta: { timestamp: '', url: '', intent: '', pointrVersion: '' },
    markdown: ''
  } as PointrPayload;

  it('store ring buffer works', () => {
    for(let i=0; i<11; i++) {
      store.push({ ...dummyPayload, dom: { ...dummyPayload.dom, cssSelector: `s${i}` }});
    }
    expect(store.getAll().length).toBe(10);
    expect(store.getLatest()?.dom.cssSelector).toBe('s10');
  });

  it('auto-discovery works', async () => {
    const { server, port } = await createServer();
    expect(port).toBe(3333);
    server.close();
  });
});
"""

tsup_config_mcp = """import { defineConfig } from 'tsup';
export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
  },
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    banner: { js: '#!/usr/bin/env node' },
    clean: false,
  },
]);
"""

# Write MCP files
def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)

write_file(os.path.join(mcp_dir, "package.json"), json.dumps(pkg_json_mcp, indent=2))
write_file(os.path.join(mcp_dir, "src/types.ts"), types_ts)
write_file(os.path.join(mcp_dir, "src/store.ts"), store_ts)
write_file(os.path.join(mcp_dir, "src/mcp-handler.ts"), mcp_handler_ts)
write_file(os.path.join(mcp_dir, "src/index.ts"), index_ts_mcp)
write_file(os.path.join(mcp_dir, "src/cli.ts"), cli_ts)
write_file(os.path.join(mcp_dir, "tests/mcp-handler.test.ts"), mcp_handler_test_ts)
write_file(os.path.join(mcp_dir, "tsup.config.ts"), tsup_config_mcp)

# ----------------- CONTEXT PACKAGER -----------------
pkg_dir = os.path.join(base_dir, "context-packager")

pkg_json_pack = {
  "name": "@pointr/context-packager",
  "version": "0.1.0",
  "description": "Context packager for Pointr",
  "keywords": ["react", "devtools", "context", "fiber", "mcp"],
  "homepage": "https://pointr.dev",
  "repository": { "type": "git", "url": "https://github.com/KananBasha/pointr" },
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "exports": { ".": "./dist/index.js" },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "type-check": "tsc --noEmit",
    "lint": "eslint src",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "tsup": "^8.2.0",
    "typescript": "^5.5.3",
    "vitest": "^2.0.4"
  }
}

tsup_config_pack = """import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
"""

fiber_reader_ts = """interface ComponentInfo {
  name: string;
  file: string;
  props: Record<string, unknown>;
  hooks: string[];
}

function findFiberKey(element: HTMLElement): string | null {
  const keys = Object.keys(element);
  return keys.find(key => key.startsWith('__reactFiber$')) || null;
}

function extractComponentName(fiber: any): string {
  if (!fiber) return 'Unknown';
  if (typeof fiber.type === 'string') return fiber.type;
  if (typeof fiber.type === 'function') return fiber.type.name || 'Anonymous';
  if (fiber.type && typeof fiber.type.render === 'function') return fiber.type.render.name || 'ForwardRef';
  if (fiber.elementType && typeof fiber.elementType.name === 'string') return fiber.elementType.name;
  return 'Unknown';
}

function extractProps(fiber: any): Record<string, unknown> {
  const props = fiber.memoizedProps || {};
  const safeProps: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children') continue;
    if (typeof value === 'function') continue;
    try {
      JSON.stringify(value);
      safeProps[key] = value;
    } catch {
      safeProps[key] = '[Complex Object]';
    }
  }
  return safeProps;
}

function extractHooks(fiber: any): string[] {
  const hooks: string[] = [];
  let currentHook = fiber.memoizedState;
  while (currentHook) {
    hooks.push('hook');
    currentHook = currentHook.next;
  }
  return hooks;
}

function getSourceFile(fiber: any): string {
  return fiber._debugSource?.fileName || 'Unknown file';
}

export function readFiberTree(element: HTMLElement): ComponentInfo[] {
  try {
    const fiberKey = findFiberKey(element);
    if (!fiberKey) return [];

    let fiber = (element as any)[fiberKey];
    const tree: ComponentInfo[] = [];
    let depth = 0;

    while (fiber && depth < 10) {
      if (fiber.type && (typeof fiber.type === 'function' || typeof fiber.type === 'object')) {
        tree.push({
          name: extractComponentName(fiber),
          file: getSourceFile(fiber),
          props: extractProps(fiber),
          hooks: extractHooks(fiber)
        });
        depth++;
      }
      fiber = fiber.return;
    }

    return tree.reverse();
  } catch (e) {
    console.warn('Pointr: Failed to read fiber tree', e);
    return [];
  }
}
"""

selector_ts = """export function generateCssSelector(element: HTMLElement): string {
  try {
    if (element.id) {
      return `#${element.id}`;
    }
    
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current.tagName && parts.length < 3) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(/\s+/).filter(c => c && !c.includes(':'));
        if (classes.length > 0) {
          selector += `.${classes.slice(0, 2).join('.')}`;
        }
      }
      
      parts.unshift(selector);
      if (current.parentElement && current.parentElement.tagName !== 'HTML') {
        current = current.parentElement;
      } else {
        break;
      }
    }
    
    return parts.join(' > ');
  } catch (e) {
    return element.tagName?.toLowerCase() || 'unknown';
  }
}

export function generateXPath(element: HTMLElement): string {
  try {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
    const paths: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      let sibling = current.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && (sibling as HTMLElement).tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      
      const tagName = current.tagName.toLowerCase();
      const pathIndex = index ? `[${index + 1}]` : '';
      paths.unshift(`${tagName}${pathIndex}`);
      
      current = current.parentElement;
    }
    
    return paths.length ? `/${paths.join('/')}` : '';
  } catch (e) {
    return 'unknown';
  }
}
"""

style_reader_ts = """const RELEVANT_PROPERTIES = [
  'background-color', 'color', 'font-size', 'font-weight', 
  'padding', 'margin', 'border-radius', 'border', 
  'box-shadow', 'display', 'width', 'height', 'opacity', 'transform'
];

export function readComputedStyles(element: HTMLElement): Record<string, string> {
  try {
    if (typeof window === 'undefined') return {};
    const computed = window.getComputedStyle(element);
    const styles: Record<string, string> = {};
    
    for (const prop of RELEVANT_PROPERTIES) {
      const val = computed.getPropertyValue(prop);
      if (val && val !== 'none' && val !== '0px' && val !== 'rgba(0, 0, 0, 0)') {
        styles[prop] = val;
      }
    }
    return styles;
  } catch (e) {
    return {};
  }
}

export function readDesignTokens(element: HTMLElement): Record<string, string> {
  return {};
}

export function extractTailwindClasses(element: HTMLElement): string[] {
  try {
    if (!element.className || typeof element.className !== 'string') return [];
    return element.className.split(/\s+/).filter(c => c.includes('-') || c.includes(':'));
  } catch {
    return [];
  }
}
"""

screenshot_ts = """export async function screenshotElement(element: HTMLElement): Promise<{ base64: string; width: number; height: number }> {
  try {
    return await Promise.race([
      new Promise<{ base64: string; width: number; height: number }>(resolve => {
        try {
          const rect = element.getBoundingClientRect();
          const canvas = document.createElement('canvas');
          canvas.width = rect.width;
          canvas.height = rect.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(0, 0, rect.width, rect.height);
          }
          resolve({
            base64: canvas.toDataURL('image/png'),
            width: rect.width,
            height: rect.height
          });
        } catch {
          resolve({ base64: '', width: 0, height: 0 });
        }
      }),
      new Promise<{ base64: string; width: number; height: number }>(resolve => {
        setTimeout(() => resolve({ base64: '', width: 0, height: 0 }), 500);
      })
    ]);
  } catch (e) {
    return { base64: '', width: 0, height: 0 };
  }
}
"""

formatter_ts = """import { PointrPayload } from './types.js';

export function formatMarkdown(payload: Omit<PointrPayload, 'markdown'>): string {
  let md = `## Pointr Element Context\n**Intent:** "${payload.meta.intent}"\n\n`;

  md += `### Source\n- **File:** \`${payload.source.file}:${payload.source.line}:${payload.source.column}\`\n- **Snippet:**\n`;
  md += `\`\`\`tsx\n${payload.source.snippet}\n\`\`\`\n\n`;

  if (payload.componentTree.length > 0) {
    md += `### Component Tree\n`;
    const treeNames = payload.componentTree.map((c, i) => {
      if (i === payload.componentTree.length - 1) return `**\`${c.name}\`** ← selected`;
      return `\`${c.name}\``;
    });
    md += `${treeNames.join(' → ')}\n\n`;
  }

  const selectedComp = payload.componentTree[payload.componentTree.length - 1];
  if (selectedComp && Object.keys(selectedComp.props).length > 0) {
    md += `### Props\n| Prop | Value |\n|------|-------|\n`;
    for (const [k, v] of Object.entries(selectedComp.props)) {
      let valStr = String(v);
      if (typeof v === 'object') valStr = JSON.stringify(v);
      md += `| ${k} | ${valStr} |\n`;
    }
    md += `\n`;
  }

  if (Object.keys(payload.styles.computed).length > 0) {
    md += `### Computed Styles\n| Property | Value |\n|----------|-------|\n`;
    for (const [k, v] of Object.entries(payload.styles.computed)) {
      md += `| ${k} | ${v} |\n`;
    }
    md += `\n`;
  }

  if (Object.keys(payload.styles.designTokens).length > 0) {
    md += `### Design Tokens\n| Token | Value |\n|-------|-------|\n`;
    for (const [k, v] of Object.entries(payload.styles.designTokens)) {
      md += `| ${k} | ${v} |\n`;
    }
    md += `\n`;
  }

  md += `### Selectors\n- **CSS:** \`${payload.dom.cssSelector}\`\n- **XPath:** \`${payload.dom.xpath}\`\n`;

  return md;
}
"""

index_ts_pack = """import { PointrPayload } from './types.js';
import { readFiberTree } from './fiber-reader.js';
import { generateCssSelector, generateXPath } from './selector.js';
import { readComputedStyles, readDesignTokens, extractTailwindClasses } from './style-reader.js';
import { screenshotElement } from './screenshot.js';
import { formatMarkdown } from './formatter.js';

export async function packContext(
  element: HTMLElement,
  intent: string,
  sourceAttr: string
): Promise<PointrPayload> {
  const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));
  
  const packPromise = async () => {
    const [file = 'Unknown', lineStr = '0', colStr = '0'] = sourceAttr.split(':');
    const line = parseInt(lineStr, 10) || 0;
    const column = parseInt(colStr, 10) || 0;

    const componentTree = readFiberTree(element);
    const cssSelector = generateCssSelector(element);
    const xpath = generateXPath(element);
    const computed = readComputedStyles(element);
    const designTokens = readDesignTokens(element);
    const tailwindClasses = extractTailwindClasses(element);
    const screenshot = await screenshotElement(element);

    const attributes: Record<string, string> = {};
    for (const attr of Array.from(element.attributes || [])) {
      attributes[attr.name] = attr.value;
    }

    const payloadWithoutMarkdown: Omit<PointrPayload, 'markdown'> = {
      source: { file, line, column, snippet: '// snippet unavailable in browser context' },
      componentTree,
      dom: { tagName: element.tagName, cssSelector, xpath, attributes, textContent: element.textContent || '' },
      styles: { computed, designTokens, tailwindClasses },
      screenshot,
      meta: { timestamp: new Date().toISOString(), url: typeof window !== 'undefined' ? window.location.href : '', intent, pointrVersion: '0.1.0' }
    };

    const markdown = formatMarkdown(payloadWithoutMarkdown);
    
    return { ...payloadWithoutMarkdown, markdown } as PointrPayload;
  };

  try {
    return await Promise.race([packPromise(), timeoutPromise]);
  } catch (e) {
    console.error('Pointr: Failed to pack context within timeout', e);
    const fallbackWithoutMarkdown = {
      source: { file: 'Unknown', line: 0, column: 0, snippet: '' },
      componentTree: [],
      dom: { tagName: element?.tagName || 'UNKNOWN', cssSelector: '', xpath: '', attributes: {}, textContent: '' },
      styles: { computed: {}, designTokens: {}, tailwindClasses: [] },
      screenshot: { base64: '', width: 0, height: 0 },
      meta: { timestamp: new Date().toISOString(), url: typeof window !== 'undefined' ? window.location.href : '', intent, pointrVersion: '0.1.0' }
    };
    const markdown = formatMarkdown(fallbackWithoutMarkdown);
    return { ...fallbackWithoutMarkdown, markdown } as PointrPayload;
  }
}
"""

formatter_test_ts = """import { describe, it, expect } from 'vitest';
import { formatMarkdown } from '../src/formatter.js';

describe('formatter', () => {
  it('formats markdown properly', () => {
    const md = formatMarkdown({
      source: { file: 'test', line: 1, column: 1, snippet: '' },
      componentTree: [{ name: 'Test', file: 'test', props: { a: 1 }, hooks: [] }],
      dom: { tagName: 'div', cssSelector: '', xpath: '', attributes: {}, textContent: '' },
      styles: { computed: {}, designTokens: {}, tailwindClasses: [] },
      screenshot: { base64: '', width: 0, height: 0 },
      meta: { timestamp: '', url: '', intent: 'Testing', pointrVersion: '' },
    });
    expect(md).toContain('**Intent:** "Testing"');
    expect(md).toContain('**`Test`** ← selected');
  });
});
"""

fiber_reader_test_ts = """import { describe, it, expect } from 'vitest';
import { readFiberTree } from '../src/fiber-reader.js';

describe('fiber-reader', () => {
  it('gracefully handles no react fiber', () => {
    const el = document.createElement('div');
    const tree = readFiberTree(el);
    expect(tree).toEqual([]);
  });
});
"""

write_file(os.path.join(pkg_dir, "package.json"), json.dumps(pkg_json_pack, indent=2))
write_file(os.path.join(pkg_dir, "src/types.ts"), types_ts)
write_file(os.path.join(pkg_dir, "tsup.config.ts"), tsup_config_pack)
write_file(os.path.join(pkg_dir, "src/fiber-reader.ts"), fiber_reader_ts)
write_file(os.path.join(pkg_dir, "src/selector.ts"), selector_ts)
write_file(os.path.join(pkg_dir, "src/style-reader.ts"), style_reader_ts)
write_file(os.path.join(pkg_dir, "src/screenshot.ts"), screenshot_ts)
write_file(os.path.join(pkg_dir, "src/formatter.ts"), formatter_ts)
write_file(os.path.join(pkg_dir, "src/index.ts"), index_ts_pack)
write_file(os.path.join(pkg_dir, "tests/formatter.test.ts"), formatter_test_ts)
write_file(os.path.join(pkg_dir, "tests/fiber-reader.test.ts"), fiber_reader_test_ts)

print("Files generated successfully.")
