import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initPointr } from '../src/index';

describe('Pointr Overlay', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('initializes pointr', () => {
    initPointr();
    expect(true).toBe(true);
  });
});
