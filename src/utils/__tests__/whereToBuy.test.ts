import { describe, it, expect } from 'vitest';
import { formatWhereToBuy } from '../whereToBuy';

describe('formatWhereToBuy', () => {
  it('https URL일 때 hostname과 href를 반환해야 함', () => {
    const result = formatWhereToBuy('https://shop.com/path');
    expect(result).toEqual({
      isUrl: true,
      displayText: 'shop.com',
      href: 'https://shop.com/path',
    });
  });

  it('http URL일 때 hostname과 href를 반환해야 함', () => {
    const result = formatWhereToBuy('http://example.co.kr');
    expect(result).toEqual({
      isUrl: true,
      displayText: 'example.co.kr',
      href: 'http://example.co.kr',
    });
  });

  it('잘못된 URL일 때 원본을 displayText로 반환해야 함', () => {
    const result = formatWhereToBuy('https://invalid..');
    expect(result.isUrl).toBe(true);
    expect(result.displayText).toBe('https://invalid..');
    expect(result.href).toBe('https://invalid..');
  });

  it('샵 이름일 때 isUrl false, displayText만 반환해야 함', () => {
    const result = formatWhereToBuy('티하우스');
    expect(result).toEqual({
      isUrl: false,
      displayText: '티하우스',
    });
    expect(result.href).toBeUndefined();
  });

  it('빈 문자열일 때 isUrl false, displayText 빈 문자열 반환해야 함', () => {
    const result = formatWhereToBuy('');
    expect(result).toEqual({
      isUrl: false,
      displayText: '',
    });
    expect(result.href).toBeUndefined();
  });

  it('공백만 있는 문자열은 trim 후 빈 문자열로 처리해야 함', () => {
    const result = formatWhereToBuy('   ');
    expect(result.displayText).toBe('');
    expect(result.isUrl).toBe(false);
  });
});
