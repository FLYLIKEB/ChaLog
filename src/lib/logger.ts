/**
 * 로깅 유틸리티
 * 개발 환경과 프로덕션 환경 모두에서 로그를 출력합니다.
 * 모바일 디버깅을 위해 프로덕션에서도 로그를 출력합니다.
 */

const isDevelopment = import.meta.env.DEV;
// 모바일 디버깅을 위해 프로덕션에서도 로그 출력 (나중에 제거 가능)
const enableLogging = true; // isDevelopment || true; // 프로덕션에서도 로그 활성화

export const logger = {
  error: (message: string, ...args: unknown[]) => {
    if (enableLogging) {
      console.error(`[Error] ${message}`, ...args);
    }
    // 프로덕션에서는 에러 추적 서비스로 전송 가능
  },
  
  warn: (message: string, ...args: unknown[]) => {
    if (enableLogging) {
      console.warn(`[Warn] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: unknown[]) => {
    if (enableLogging) {
      console.info(`[Info] ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: unknown[]) => {
    if (enableLogging) {
      console.debug(`[Debug] ${message}`, ...args);
    }
  },
};

