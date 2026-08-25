// Global type augmentation for Pointr overlay config
export {};

declare global {
  interface Window {
    __POINTR_CONFIG__?: {
      /** Disable the overlay entirely */
      disabled?: boolean;
      /** MCP server port (default: 3333) */
      mcpPort?: number;
      /** Activation hotkey (default: 'Alt') */
      hotkey?: string;
    };
  }
}
