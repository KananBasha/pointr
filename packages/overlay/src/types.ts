export interface PointrPayload {
  source: {
    file: string;       // "src/components/ui/Button.tsx"
    line: number;       // 42
    column: number;     // 5
    snippet: string;    // 3 lines of source context
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

declare global {
  interface Window {
    __POINTR_CONFIG__?: {
      hotkey?: string;
      mcpPort?: number;
      disabled?: boolean;
    };
  }
}
