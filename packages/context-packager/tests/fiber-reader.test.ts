import { describe, it, expect } from 'vitest';
import { readFiberTree } from '../src/fiber-reader.js';

describe('fiber-reader', () => {
  it('gracefully handles no react fiber', () => {
    const el = document.createElement('div');
    const tree = readFiberTree(el);
    expect(tree).toEqual([]);
  });
});
