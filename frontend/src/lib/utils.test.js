import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('combines class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('handles conditional classes', () => {
    expect(cn('a', true && 'b', false && 'c')).toBe('a b');
  });

  it('merges tailwind classes correctly', () => {
    // p-4 and p-2 conflict, p-2 should win if it comes later in tw-merge logic
    // actually tw-merge handles it based on tailwind rules
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });
});
