import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_PREFIX = 'scroll_pos_';

function getKey(pathname: string): string {
  return `${STORAGE_PREFIX}${pathname}`;
}

/**
 * 라우트 이탈 시 스크롤 위치를 sessionStorage에 저장하고,
 * 해당 라우트로 돌아올 때 스크롤 위치를 복원한다.
 *
 * @param scrollContainerRef 스크롤 컨테이너 ref. 없으면 window 기준으로 동작.
 */
export function useScrollRestoration(
  scrollContainerRef?: React.RefObject<HTMLElement | null>,
) {
  const { pathname } = useLocation();
  const savedPathname = useRef<string>(pathname);

  // 라우트 변경 시 이전 경로의 스크롤 위치 저장
  useEffect(() => {
    const prevPathname = savedPathname.current;

    return () => {
      const scrollY = scrollContainerRef?.current
        ? scrollContainerRef.current.scrollTop
        : window.scrollY;
      try {
        sessionStorage.setItem(getKey(prevPathname), String(scrollY));
      } catch {
        // sessionStorage 접근 불가 시 무시
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // 라우트 진입 시 저장된 스크롤 위치 복원
  useEffect(() => {
    savedPathname.current = pathname;

    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(getKey(pathname));
    } catch {
      // sessionStorage 접근 불가 시 무시
    }

    if (stored !== null) {
      const scrollY = parseFloat(stored);
      if (!Number.isNaN(scrollY)) {
        requestAnimationFrame(() => {
          if (scrollContainerRef?.current) {
            scrollContainerRef.current.scrollTop = scrollY;
          } else {
            window.scrollTo(0, scrollY);
          }
        });
      }
    }
  }, [pathname, scrollContainerRef]);
}
