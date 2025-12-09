import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 전역 에러 핸들러 추가 (모바일 디버깅용)
// HMR 등으로 여러 번 평가될 때 중복 등록 방지
if (typeof window !== "undefined" && !window.__chalLogErrorHandlerRegistered) {
  window.__chalLogErrorHandlerRegistered = true;

  window.addEventListener('error', (event) => {
    console.error('[Global Error Handler]', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      errorStack: event.error?.stack,
      errorName: event.error?.name,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]', {
      reason: event.reason,
      promise: event.promise,
      error: event.reason instanceof Error ? {
        name: event.reason.name,
        message: event.reason.message,
        stack: event.reason.stack,
      } : event.reason,
    });
    // 기본 브라우저 콘솔 로그와 중복 방지 (선택사항)
    // event.preventDefault();
  });
}

createRoot(document.getElementById("root")!).render(<App />);