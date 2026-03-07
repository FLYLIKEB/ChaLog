import { useState, useEffect } from 'react';

/** 브라우저 언어가 한국어인지 여부 (ko, ko-KR 등) */
export function useIsKorean(): boolean {
  const [isKorean, setIsKorean] = useState(true); // SSR 기본값

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsKorean(navigator.language.startsWith('ko'));
    }
  }, []);

  return isKorean;
}
