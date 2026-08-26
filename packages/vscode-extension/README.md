# Pointr for VS Code & Cursor

**Pointr** is an AI-native developer tool that bridges the gap between browser UI and your editor.

When you click on any UI element in your running web application (<kbd>Alt</kbd> + Click), this extension **automatically opens the exact source file and highlights the line** in VS Code or Cursor in real time.

---

## Features

- **⚡ Instant File Navigation**: Connects to the local Pointr MCP Server (`localhost:3333` with auto-scanning up to `3340`) via Server-Sent Events (SSE).
- **🎯 Visual Line Halo**: Highlights the targeted line with a subtle transient decoration.
- **🔄 Auto-Follow Mode**: Toggle live follow mode on/off from the status bar.
- **🛡️ 100% Local & Private**: No external network requests, zero telemetry.

---

## Getting Started

1. Start your Pointr-enabled dev server or the Pointr MCP server:
   ```bash
   npx @pointr/mcp-server
   ```
2. Open your web app in the browser, hold <kbd>Alt</kbd> and click on any element.
3. Your editor automatically opens the component file at the exact line!

---

## Configuration

| Setting                    | Default | Description                                           |
| -------------------------- | ------- | ----------------------------------------------------- |
| `pointr.serverPort`        | `3333`  | Port for the local Pointr MCP server                  |
| `pointr.autoOpen`          | `true`  | Automatically open file and line on element selection |
| `pointr.highlightDuration` | `2000`  | Duration (ms) for the line highlight decoration       |

---

## License

MIT © [Pointr Contributors](https://github.com/KananBasha/pointr)
