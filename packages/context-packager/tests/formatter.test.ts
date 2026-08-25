import { describe, it, expect } from 'vitest';
import { formatMarkdown } from '../src/formatter.js';

describe('formatter', () => {
  it('formats markdown properly', () => {
    const md = formatMarkdown({
      source: { file: 'test', line: 1, column: 1, snippet: '' },
      componentTree: [{ name: 'Test', file: 'test', props: { a: 1 }, hooks: [] }],
      dom: { tagName: 'div', cssSelector: '', xpath: '', attributes: {}, textContent: '' },
      styles: { computed: {}, designTokens: {}, tailwindClasses: [] },
      screenshot: { base64: '', width: 0, height: 0 },
      meta: { timestamp: '', url: '', intent: 'Testing', pointrVersion: '' },
    });
    expect(md).toContain('**Intent:** "Testing"');
    expect(md).toContain('**`Test`** ← selected');
  });
});
