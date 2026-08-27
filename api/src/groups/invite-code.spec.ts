import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_CODE_MAX_LENGTH,
  generateInviteCode,
  normalizeInviteCode,
} from './invite-code';

describe('invite codes', () => {
  describe('generateInviteCode', () => {
    it('draws a code of the declared length', () => {
      expect(generateInviteCode()).toHaveLength(INVITE_CODE_LENGTH);
    });

    it('fits the column it is stored in', () => {
      expect(INVITE_CODE_LENGTH).toBeLessThanOrEqual(INVITE_CODE_MAX_LENGTH);
    });

    it('uses only alphabet characters', () => {
      for (let i = 0; i < 200; i += 1) {
        for (const character of generateInviteCode()) {
          expect(INVITE_CODE_ALPHABET).toContain(character);
        }
      }
    });

    // The whole point of the alphabet: a code is read off one screen and typed
    // into another, so a character that can be misread for another one costs a
    // user the join.
    it('never emits a lookalike character', () => {
      for (const lookalike of ['I', 'L', 'O', 'U', '0', '1']) {
        expect(INVITE_CODE_ALPHABET).not.toContain(lookalike);
      }
    });

    it('does not repeat itself', () => {
      const codes = new Set(
        Array.from({ length: 500 }, () => generateInviteCode()),
      );

      expect(codes.size).toBe(500);
    });
  });

  describe('normalizeInviteCode', () => {
    // FR-26: what the user types has to resolve to the group whatever shape
    // they typed it in.
    it('accepts the code in any case', () => {
      expect(normalizeInviteCode('ab3k9qz2')).toBe('AB3K9QZ2');
    });

    it('ignores the grouping dashes a code is displayed with', () => {
      expect(normalizeInviteCode('AB3K-9QZ2')).toBe('AB3K9QZ2');
    });

    it('ignores surrounding and embedded whitespace', () => {
      expect(normalizeInviteCode('  ab3k 9qz2 ')).toBe('AB3K9QZ2');
    });

    it('leaves an already-normal code alone', () => {
      expect(normalizeInviteCode('AB3K9QZ2')).toBe('AB3K9QZ2');
    });
  });
});
