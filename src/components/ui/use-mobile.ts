import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function getInitialIsMobile() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(getInitialIsMobile);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mql = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
    );
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    mql.addEventListener("change", onChange);
    // 초기 렌더 이후에도 한 번 더 동기화
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    return () => {
      mql.removeEventListener("change", onChange);
    };
  }, []);

  return isMobile;
}
