/**
 * 로깅 유틸리티
 * 개발 환경에서만 콘솔에 로그를 출력하고, 프로덕션에서는 로그를 숨깁니다.
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  error: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.error(`[Error] ${message}`, ...args);
    }
    // 프로덕션에서는 에러 추적 서비스로 전송 가능
  },
  
  warn: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(`[Warn] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.info(`[Info] ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(`[Debug] ${message}`, ...args);
    }
  },
};

