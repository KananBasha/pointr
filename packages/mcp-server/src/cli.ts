import { createServer } from "./index.js";

async function main() {
  const args = process.argv.slice(2);
  let port = 3333;

  const portIndex = args.indexOf("--port");
  if (portIndex !== -1 && args[portIndex + 1]) {
    port = parseInt(args[portIndex + 1]!, 10);
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
    console.error("Failed to start Pointr MCP Server:", err);
    process.exit(1);
  }
}

main();
