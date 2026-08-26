import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
          base64Data = base64Data.split(',')[1] ?? base64Data;

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
