import { PointrPayload } from './types.js';

class PayloadStore {
  private buffer: PointrPayload[] = [];
  private readonly MAX_SIZE = 10;

  push(payload: PointrPayload): void {
    this.buffer.push(payload);
    if (this.buffer.length > this.MAX_SIZE) {
      this.buffer.shift();
    }
  }

  getLatest(): PointrPayload | null {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
  }

  getAll(): PointrPayload[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
  }
}

export const store = new PayloadStore();
