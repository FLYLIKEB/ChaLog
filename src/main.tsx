import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 전역 에러 핸들러 추가 (모바일 디버깅용)
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
});

createRoot(document.getElementById("root")!).render(<App />);