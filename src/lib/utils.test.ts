/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins class names with spaces', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('merges tailwind classes intelligently', () => {
    // tailwind-merge should keep the last conflicting class
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

