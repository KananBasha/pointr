export interface PointrPayload {
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
