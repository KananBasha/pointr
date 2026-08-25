import { PointrPayload } from './types.js';
import { readFiberTree } from './fiber-reader.js';
import { generateCssSelector, generateXPath } from './selector.js';
import { readComputedStyles, readDesignTokens, extractTailwindClasses } from './style-reader.js';
import { screenshotElement } from './screenshot.js';
import { formatMarkdown } from './formatter.js';

export async function packContext(
  element: HTMLElement,
  intent: string,
  sourceAttr: string
): Promise<PointrPayload> {
  const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));
  
  const packPromise = async () => {
    const [file = 'Unknown', lineStr = '0', colStr = '0'] = sourceAttr.split(':');
    const line = parseInt(lineStr, 10) || 0;
    const column = parseInt(colStr, 10) || 0;

    const componentTree = readFiberTree(element);
    const cssSelector = generateCssSelector(element);
    const xpath = generateXPath(element);
    const computed = readComputedStyles(element);
    const designTokens = readDesignTokens(element);
    const tailwindClasses = extractTailwindClasses(element);
    const screenshot = await screenshotElement(element);

    const attributes: Record<string, string> = {};
    for (const attr of Array.from(element.attributes || [])) {
      attributes[attr.name] = attr.value;
    }

    const payloadWithoutMarkdown: Omit<PointrPayload, 'markdown'> = {
      source: { file, line, column, snippet: '// snippet unavailable in browser context' },
      componentTree,
      dom: { tagName: element.tagName, cssSelector, xpath, attributes, textContent: element.textContent || '' },
      styles: { computed, designTokens, tailwindClasses },
      screenshot,
      meta: { timestamp: new Date().toISOString(), url: typeof window !== 'undefined' ? window.location.href : '', intent, pointrVersion: '0.1.0' }
    };

    const markdown = formatMarkdown(payloadWithoutMarkdown);
    
    return { ...payloadWithoutMarkdown, markdown } as PointrPayload;
  };

  try {
    return await Promise.race([packPromise(), timeoutPromise]);
  } catch (e) {
    console.error('Pointr: Failed to pack context within timeout', e);
    const fallbackWithoutMarkdown = {
      source: { file: 'Unknown', line: 0, column: 0, snippet: '' },
      componentTree: [],
      dom: { tagName: element?.tagName || 'UNKNOWN', cssSelector: '', xpath: '', attributes: {}, textContent: '' },
      styles: { computed: {}, designTokens: {}, tailwindClasses: [] },
      screenshot: { base64: '', width: 0, height: 0 },
      meta: { timestamp: new Date().toISOString(), url: typeof window !== 'undefined' ? window.location.href : '', intent, pointrVersion: '0.1.0' }
    };
    const markdown = formatMarkdown(fallbackWithoutMarkdown);
    return { ...fallbackWithoutMarkdown, markdown } as PointrPayload;
  }
}
