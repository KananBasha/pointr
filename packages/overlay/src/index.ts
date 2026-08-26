import { initHighlight, destroyHighlight } from "./highlight";
import { showIntentDialog } from "./intent-ui";
import { sendToMCP } from "./sender";
import { PointrPayload } from "./types";

let isActive = false;
let indicator: HTMLDivElement | null = null;

function updateIndicator() {
  if (isActive) {
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.textContent = "⊕ Pointr active";
      indicator.style.cssText = `
        position: fixed;
        bottom: 12px;
        right: 12px;
        background: #3b82f6;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-family: system-ui, sans-serif;
        font-size: 12px;
        font-weight: 600;
        z-index: 999997;
        pointer-events: none;
        box-shadow: 0 2px 4px rgb(0 0 0 / 0.1);
      `;
      document.body.appendChild(indicator);
    }
    indicator.style.display = "block";
  } else if (indicator) {
    indicator.style.display = "none";
  }
}

function extractPayload(
  element: HTMLElement,
  intent: string,
  sourceAttr: string | null
): PointrPayload {
  let file = "";
  let line = 0;
  let column = 0;

  if (sourceAttr) {
    const parts = sourceAttr.split(":");
    if (parts.length >= 3) {
      column = parseInt(parts.pop() || "0", 10);
      line = parseInt(parts.pop() || "0", 10);
      file = parts.join(":");
    } else if (parts.length === 2) {
      line = parseInt(parts.pop() || "0", 10);
      file = parts[0] ?? "";
    } else {
      file = sourceAttr;
    }
  }

  const domAttrs: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    if (attr.name !== "data-pointr-source") {
      domAttrs[attr.name] = attr.value;
    }
  }

  const payload: PointrPayload = {
    source: {
      file,
      line,
      column,
      snippet: "",
    },
    componentTree: [],
    dom: {
      tagName: element.tagName.toLowerCase(),
      cssSelector: "",
      xpath: "",
      attributes: domAttrs,
      textContent: element.textContent?.slice(0, 200) || "",
    },
    styles: {
      computed: {},
      designTokens: {},
      tailwindClasses: Array.from(element.classList),
    },
    screenshot: {
      base64: "",
      width: 0,
      height: 0,
    },
    meta: {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      intent,
      pointrVersion: "0.1.0",
    },
    markdown: `## Pointr Element Context

**Intent:** "${intent}"

### Target Element
- **Source File:** \`${file}:${line}:${column}\`
- **DOM Element:** \`<${element.tagName.toLowerCase()}${
      domAttrs.class ? ` class="${domAttrs.class}"` : ""
    }>\`
${domAttrs.id ? `- **ID:** \`${domAttrs.id}\`\n` : ""}${
      element.textContent?.trim()
        ? `- **Content:** "${element.textContent.trim().slice(0, 100)}"\n`
        : ""
    }
### Instruction for AI Agent
Please apply the requested changes to the component defined in \`${file}:${line}\`.`,
  };

  return payload;
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === "Alt" && !isActive) {
    isActive = true;
    updateIndicator();
    initHighlight();
  }
}

function handleGlobalKeyup(e: KeyboardEvent) {
  if (e.key === "Alt" && isActive) {
    isActive = false;
    updateIndicator();
    destroyHighlight();
  }
}

async function handleGlobalClick(e: MouseEvent) {
  if (!e.altKey || !isActive) return;

  e.preventDefault();
  e.stopPropagation();

  const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
  if (!target) return;

  const sourceEl = target.closest("[data-pointr-source]") as HTMLElement | null;
  const sourceAttr = sourceEl?.getAttribute("data-pointr-source") || null;

  const intent = await showIntentDialog(target, sourceAttr);
  if (intent !== null) {
    const payload = extractPayload(target, intent, sourceAttr);
    const mcpPort = window.__POINTR_CONFIG__?.mcpPort || 3333;
    await sendToMCP(payload, mcpPort);
  }
}

export function initPointr() {
  if (window.__POINTR_CONFIG__?.disabled) return;

  document.addEventListener("keydown", handleGlobalKeydown);
  document.addEventListener("keyup", handleGlobalKeyup);
  document.addEventListener("click", handleGlobalClick, { capture: true });
}

// Auto-init
if (typeof window !== "undefined") {
  initPointr();
}
