import type { TransformFnParams } from 'class-transformer';

/**
 * Trims a string field before class-validator sees it.
 *
 * Applied so a pasted "  ada@sterna.app " fails or passes on its content
 * rather than its whitespace, and so a value made only of spaces is rejected
 * by @MinLength here instead of violating a users_*_not_blank CHECK and
 * surfacing as a 500.
 */
export function trimmed({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
