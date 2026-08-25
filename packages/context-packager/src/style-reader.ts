const RELEVANT_PROPERTIES = [
  'background-color', 'color', 'font-size', 'font-weight', 
  'padding', 'margin', 'border-radius', 'border', 
  'box-shadow', 'display', 'width', 'height', 'opacity', 'transform'
];

export function readComputedStyles(element: HTMLElement): Record<string, string> {
  try {
    if (typeof window === 'undefined') return {};
    const computed = window.getComputedStyle(element);
    const styles: Record<string, string> = {};
    
    for (const prop of RELEVANT_PROPERTIES) {
      const val = computed.getPropertyValue(prop);
      if (val && val !== 'none' && val !== '0px' && val !== 'rgba(0, 0, 0, 0)') {
        styles[prop] = val;
      }
    }
    return styles;
  } catch (e) {
    return {};
  }
}

export function readDesignTokens(element: HTMLElement): Record<string, string> {
  return {};
}

export function extractTailwindClasses(element: HTMLElement): string[] {
  try {
    if (!element.className || typeof element.className !== 'string') return [];
    return element.className.split(/\s+/).filter(c => c.includes('-') || c.includes(':'));
  } catch {
    return [];
  }
}
