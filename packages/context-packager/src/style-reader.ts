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
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return {};
    const tokens: Record<string, string> = {};
    const computed = window.getComputedStyle(element);

    // First pass: collect all --custom-property names referenced in computed styles
    // by scanning the element's inline style and matched CSS rules
    const candidateVars = new Set<string>();

    // Walk all stylesheets to find CSS custom properties declared in rules that match element
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules;
        if (!rules) continue;
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSStyleRule) {
            // Only process rules that could apply to this element
            if (!element.matches(rule.selectorText)) continue;
            const text = rule.style.cssText;
            const varMatches = text.matchAll(/--[\w-]+/g);
            for (const match of varMatches) {
              candidateVars.add(match[0]);
            }
          }
        }
      } catch {
        // Cross-origin stylesheets throw SecurityError — skip
      }
    }

    // Also find vars used in inline styles or data attributes
    const inlineVarMatches = (element.getAttribute('style') || '').matchAll(/var\((--[\w-]+)\)/g);
    for (const match of inlineVarMatches) {
      if (match[1]) candidateVars.add(match[1]);
    }

    // Resolve each candidate var against the element's computed style
    for (const varName of candidateVars) {
      const val = computed.getPropertyValue(varName).trim();
      if (val) tokens[varName] = val;
    }

    return tokens;
  } catch {
    return {};
  }
}


export function extractTailwindClasses(element: HTMLElement): string[] {
  try {
    if (!element.className || typeof element.className !== 'string') return [];
    return element.className.split(/\s+/).filter(c => c.includes('-') || c.includes(':'));
  } catch {
    return [];
  }
}
