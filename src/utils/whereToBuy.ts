/**
 * 구입처(whereToBuy) 문자열을 파싱하여 URL 여부, 표시 텍스트, 링크를 반환합니다.
 * @param value - 샵 이름 또는 URL
 * @returns isUrl, displayText, href (URL인 경우에만)
 */
export function formatWhereToBuy(value: string): {
  isUrl: boolean;
  displayText: string;
  href?: string;
} {
  const trimmed = value.trim();
  const isUrl = /^https?:\/\//i.test(trimmed);

  if (isUrl) {
    try {
      const url = new URL(trimmed);
      return {
        isUrl: true,
        displayText: url.hostname,
        href: trimmed,
      };
    } catch {
      return {
        isUrl: true,
        displayText: trimmed,
        href: trimmed,
      };
    }
  }

  return {
    isUrl: false,
    displayText: trimmed,
  };
}
