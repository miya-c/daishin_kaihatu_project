import { describe, it, expect } from 'vitest';
import { validateId, validateIds } from '../validateParams';

describe('validateId', () => {
  it('returns invalid for null', () => {
    const result = validateId(null, '物件ID');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('物件IDが指定されていません');
  });

  it('returns invalid for undefined', () => {
    const result = validateId(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('IDが指定されていません');
  });

  it('returns invalid for non-string values', () => {
    expect(validateId(123).valid).toBe(false);
    expect(validateId({}).valid).toBe(false);
    expect(validateId([]).valid).toBe(false);
    expect(validateId(true).valid).toBe(false);
  });

  it('returns invalid for empty string', () => {
    const result = validateId('', 'テスト');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('テストが指定されていません');
  });

  it('returns invalid for whitespace-only string', () => {
    const result = validateId('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('IDが指定されていません');
  });

  it('returns invalid for string exceeding max length', () => {
    const longString = 'a'.repeat(129);
    const result = validateId(longString, 'ID');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('長すぎます');
  });

  it('returns invalid for string with special characters', () => {
    expect(validateId('test@invalid').valid).toBe(false);
    expect(validateId('test#id').valid).toBe(false);
    expect(validateId('id with spaces').valid).toBe(false);
    expect(validateId('<script>').valid).toBe(false);
  });

  it('returns valid for normal alphanumeric ID', () => {
    expect(validateId('prop-001').valid).toBe(true);
    expect(validateId('room_101').valid).toBe(true);
    expect(validateId('room.2').valid).toBe(true);
    expect(validateId('ABC123').valid).toBe(true);
  });

  it('returns valid for string at max length (128 chars)', () => {
    const maxString = 'a'.repeat(128);
    expect(validateId(maxString).valid).toBe(true);
  });

  it('uses default param name when not specified', () => {
    const result = validateId(null);
    expect(result.error).toBe('IDが指定されていません。');
  });
});

describe('validateIds', () => {
  it('returns valid for empty object', () => {
    const result = validateIds({});
    expect(result.valid).toBe(true);
  });

  it('returns valid when all IDs are valid', () => {
    const result = validateIds({
      propertyId: 'prop-001',
      roomId: 'room-101',
    });
    expect(result.valid).toBe(true);
  });

  it('returns first invalid result', () => {
    const result = validateIds({
      propertyId: 'valid-id',
      roomId: '<invalid>',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('roomId');
  });

  it('returns first error for multiple invalid IDs', () => {
    const result = validateIds({
      propertyId: '',
      roomId: '<bad>',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('propertyId');
  });
});
