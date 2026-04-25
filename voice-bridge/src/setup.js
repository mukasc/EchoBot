import { vi } from 'vitest';

vi.mock('child_process', () => ({
  exec: vi.fn((cmd, cb) => {
    if (cb) cb(null);
    return { on: vi.fn() };
  }),
}));
