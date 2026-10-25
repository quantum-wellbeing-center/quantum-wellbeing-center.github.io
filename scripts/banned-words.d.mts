/** Types for banned-words.mjs, so tests/routes.spec.ts can import it under strict TypeScript. */
export interface BannedWordRule {
  label: string;
  re: RegExp;
}

export interface BannedWordHit {
  word: string;
  label: string;
  index: number;
  line: number;
}

export const BANNED_WORDS: BannedWordRule[];
export function findBannedWords(text: string): BannedWordHit[];
