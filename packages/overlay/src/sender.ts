import { PointrPayload } from "./types";

function showToast(message: string) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 500;
    z-index: 9999999;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    transition: opacity 0.3s ease;
    pointer-events: none;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

export async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission prompt blocked or document unfocused, use execCommand fallback
  }

  try {
    if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      return successful;
    }
  } catch (err) {
    console.error("[Pointr] Clipboard copy failed:", err);
  }
  return false;
}

export async function sendToClipboard(payload: PointrPayload) {
  const copied = await writeClipboard(payload.markdown);
  if (copied) {
    showToast("✓ Copied to clipboard");
  }
}

export async function sendToMCP(payload: PointrPayload, port: number = 3333) {
  // Always copy to clipboard so the developer can paste anywhere
  const copied = await writeClipboard(payload.markdown);
  let sentToMcp = false;

  try {
    const res = await fetch(`http://localhost:${port}/context`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      sentToMcp = true;
    }
  } catch {
    // MCP not running
  }

  if (sentToMcp && copied) {
    showToast("✓ Sent to agent & Copied to clipboard");
  } else if (sentToMcp) {
    showToast("✓ Sent to agent");
  } else if (copied) {
    showToast("✓ Copied to clipboard");
  } else {
    showToast("⚠️ Could not copy to clipboard");
  }
}
