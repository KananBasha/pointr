---
"@pointr/vite-plugin": minor
"@pointr/overlay": minor
"@pointr/mcp-server": minor
"@pointr/context-packager": minor
---

Initial release of Pointr — AI-native visual element picker for dev workflows.

- `@pointr/vite-plugin`: Vite/Next.js plugin that injects `data-pointr-source` attributes on all JSX elements at build time (dev only)
- `@pointr/overlay`: Browser IIFE overlay with Alt+Click element picker, floating intent dialog, MCP sender and clipboard fallback
- `@pointr/mcp-server`: Local MCP server exposing `get_selected_element_context` tool with ring buffer store and port auto-discovery 3333→3340
- `@pointr/context-packager`: Context assembler reading React fiber tree, computed styles, design tokens, CSS selectors, XPath, and screenshot
