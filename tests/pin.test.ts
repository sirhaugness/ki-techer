import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin } from '@/lib/auth/pin';
describe('PIN', () => {
  it('salts hashes, verifies exact digits, and rejects malformed input', () => {
    const hash = hashPin('0123');
    expect(hash).toMatch(/^[a-f0-9]{32}:[a-f0-9]{64}$/);
    expect(hashPin('0123')).not.toBe(hash);
    expect(verifyPin('0123', hash)).toBe(true);
    for (const value of ['123', '12345', 'abcd', '9999'])
      expect(verifyPin(value, hash)).toBe(false);
    expect(verifyPin('0123', 'broken')).toBe(false);
    expect(() => hashPin('12')).toThrow();
  });
});
