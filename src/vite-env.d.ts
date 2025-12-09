/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_KAKAO_APP_KEY?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 전역 에러 핸들러 등록 플래그 타입 선언
declare global {
  interface Window {
    __chalLogErrorHandlerRegistered?: boolean;
  }
}

export {};

