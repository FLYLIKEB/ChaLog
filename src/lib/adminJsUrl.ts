/**
 * AdminJS UI는 백엔드에서 /adminjs 로 서빙된다.
 * VITE_API_BASE_URL이 절대 URL이면 그 오리진 + /adminjs,
 * 상대 경로(/api) 또는 미설정이면 현재 오리진 + /adminjs.
 */
export function getAdminJsUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api';
  try {
    if (base.startsWith('http://') || base.startsWith('https://')) {
      return new URL(base).origin + '/adminjs';
    }
  } catch {
    // invalid URL, fallback
  }
  return typeof window !== 'undefined' ? window.location.origin + '/adminjs' : '';
}
