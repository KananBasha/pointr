let styleEl: HTMLStyleElement | null = null;
let currentHighlightedEl: HTMLElement | null = null;
let tooltipEl: HTMLDivElement | null = null;

function injectStyles() {
  if (styleEl) return;
  styleEl = document.createElement('style');
  styleEl.textContent = `
    .pointr-hover {
      outline: 2px solid #3b82f6 !important;
      outline-offset: -2px !important;
      cursor: crosshair !important;
    }
    #__pointr_tooltip__ {
      position: fixed;
      background: #1e293b;
      color: #f8fafc;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      z-index: 999998;
      pointer-events: none;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      border: 1px solid #334155;
      display: none;
    }
  `;
  document.head.appendChild(styleEl);
}

function createTooltip() {
  if (tooltipEl) return;
  tooltipEl = document.createElement('div');
  tooltipEl.id = '__pointr_tooltip__';
  document.body.appendChild(tooltipEl);
}

function handleMouseMove(e: MouseEvent) {
  if (!e.altKey) return;
  
  const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
  if (!target || target.id.startsWith('__pointr')) {
    clearHighlight();
    return;
  }
  
  if (target !== currentHighlightedEl) {
    clearHighlight();
    currentHighlightedEl = target;
    target.classList.add('pointr-hover');
    
    // Find closest source attr
    const sourceEl = target.closest('[data-pointr-source]') as HTMLElement | null;
    const sourceAttr = sourceEl?.getAttribute('data-pointr-source');
    
    if (tooltipEl) {
      if (sourceAttr) {
        tooltipEl.textContent = sourceAttr;
        tooltipEl.style.display = 'block';
      } else {
        tooltipEl.textContent = target.tagName.toLowerCase();
        tooltipEl.style.display = 'block';
      }
    }
  }

  if (tooltipEl && tooltipEl.style.display === 'block') {
    // Keep it on screen
    let x = e.clientX + 10;
    let y = e.clientY + 15;
    const rect = tooltipEl.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - 10;
    if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - 15;
    
    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
  }
}

function clearHighlight() {
  if (currentHighlightedEl) {
    currentHighlightedEl.classList.remove('pointr-hover');
    currentHighlightedEl = null;
  }
  if (tooltipEl) {
    tooltipEl.style.display = 'none';
  }
}

export function initHighlight() {
  injectStyles();
  createTooltip();
  document.addEventListener('mousemove', handleMouseMove, { capture: true });
}

export function destroyHighlight() {
  clearHighlight();
  document.removeEventListener('mousemove', handleMouseMove, { capture: true });
}
