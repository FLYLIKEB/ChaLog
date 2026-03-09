/**
 * 로깅 유틸리티
 * 개발 환경에서만 로그를 출력합니다.
 * 프로덕션에서는 로그를 출력하지 않아 성능에 영향을 주지 않습니다.
 */

const enableLogging = import.meta.env.DEV;

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

