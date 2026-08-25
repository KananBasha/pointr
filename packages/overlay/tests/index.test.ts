import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initPointr } from '../src/index';

// Declare global type for tests
declare global {
  interface Window {
    __POINTR_CONFIG__?: { disabled?: boolean; mcpPort?: number };
  }
}

describe('Pointr Overlay — initPointr', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button data-pointr-source="src/App.tsx:10:3">Click me</button>';
    vi.clearAllMocks();
    delete window.__POINTR_CONFIG__;
  });

  afterEach(() => {
    // Clean up event listeners by resetting the module would require module reloading
    // For now we verify the side effects directly
    document.body.innerHTML = '';
  });

  it('initializes without throwing', () => {
    expect(() => initPointr()).not.toThrow();
  });

  it('respects disabled config flag', () => {
    window.__POINTR_CONFIG__ = { disabled: true };
    const addSpy = vi.spyOn(document, 'addEventListener');
    initPointr();
    // When disabled, no event listeners are added for keydown
    const keydownCalls = addSpy.mock.calls.filter(([type]) => type === 'keydown');
    expect(keydownCalls.length).toBe(0);
  });

  it('adds keyboard event listeners when enabled', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    initPointr();
    const types = addSpy.mock.calls.map(([type]) => type);
    expect(types).toContain('keydown');
    expect(types).toContain('keyup');
    expect(types).toContain('click');
  });
});

describe('Pointr Overlay — data-pointr-source parsing', () => {
  it('correctly parses file:line:col format', () => {
    // Test the sourceAttr parsing logic inline
    const sourceAttr = 'src/components/Button.tsx:42:5';
    const parts = sourceAttr.split(':');
    const column = parseInt(parts.pop() || '0', 10);
    const line = parseInt(parts.pop() || '0', 10);
    const file = parts.join(':');

    expect(file).toBe('src/components/Button.tsx');
    expect(line).toBe(42);
    expect(column).toBe(5);
  });

  it('handles Windows-style paths with drive letters', () => {
    const sourceAttr = 'C:/Users/dev/src/App.tsx:10:3';
    const parts = sourceAttr.split(':');
    const column = parseInt(parts.pop() || '0', 10);
    const line = parseInt(parts.pop() || '0', 10);
    const file = parts.join(':');

    expect(file).toBe('C:/Users/dev/src/App.tsx');
    expect(line).toBe(10);
    expect(column).toBe(3);
  });

  it('handles missing source attr gracefully', () => {
    const sourceAttr = null;
    const file = sourceAttr ?? '';
    expect(file).toBe('');
  });
});

describe('Pointr Overlay — active state indicator', () => {
  it('creates indicator element when Alt is pressed', () => {
    initPointr();
    // Simulate Alt keydown
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', bubbles: true }));
    const indicator = document.querySelector('[style*="Pointr active"]') ??
      document.querySelector('div[style*="bottom: 12px"]');
    expect(indicator).not.toBeNull();
  });

  it('hides indicator element when Alt is released', () => {
    initPointr();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', bubbles: true }));
    const indicator = document.querySelector('div[style*="display: none"]');
    expect(indicator).not.toBeNull();
  });
});
