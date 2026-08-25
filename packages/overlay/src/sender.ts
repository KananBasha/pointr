import { PointrPayload } from './types';

function showToast(message: string) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    z-index: 9999999;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    transition: opacity 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

export async function sendToClipboard(payload: PointrPayload) {
  try {
    await navigator.clipboard.writeText(payload.markdown);
    showToast('✓ Copied to clipboard');
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
  }
}

export async function sendToMCP(payload: PointrPayload, port: number = 3333) {
  try {
    const res = await fetch(`http://localhost:${port}/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (res.ok) {
      showToast('✓ Sent to agent');
    } else {
      throw new Error(`MCP returned ${res.status}`);
    }
  } catch (err) {
    console.warn('MCP connection failed, falling back to clipboard.', err);
    await sendToClipboard(payload);
  }
}
