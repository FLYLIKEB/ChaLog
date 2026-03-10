/**
 * 위로 당겨 새로고침이 활성화되는 경로
 * 이 경로에 있을 때만 pull-to-refresh가 동작합니다.
 */
export const PULL_TO_REFRESH_PATHS = ['/', '/sasaek', '/chadam'] as const;

export function isPullToRefreshAllowed(pathname: string): boolean {
  return (PULL_TO_REFRESH_PATHS as readonly string[]).includes(pathname);
}
