export function generateCssSelector(element: HTMLElement): string {
  try {
    if (element.id) {
      return `#${element.id}`;
    }
    
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current.tagName && parts.length < 3) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(/\s+/).filter(c => c && !c.includes(':'));
        if (classes.length > 0) {
          selector += `.${classes.slice(0, 2).join('.')}`;
        }
      }
      
      parts.unshift(selector);
      if (current.parentElement && current.parentElement.tagName !== 'HTML') {
        current = current.parentElement;
      } else {
        break;
      }
    }
    
    return parts.join(' > ');
  } catch (e) {
    return element.tagName?.toLowerCase() || 'unknown';
  }
}

export function generateXPath(element: HTMLElement): string {
  try {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
    const paths: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      let sibling = current.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && (sibling as HTMLElement).tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      
      const tagName = current.tagName.toLowerCase();
      const pathIndex = index ? `[${index + 1}]` : '';
      paths.unshift(`${tagName}${pathIndex}`);
      
      current = current.parentElement;
    }
    
    return paths.length ? `/${paths.join('/')}` : '';
  } catch (e) {
    return 'unknown';
  }
}
