import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

declare const Deno:
  | {
      serve: (handler: (request: Request) => Response | Promise<Response>) => void;
    }
  | undefined;
const app = new Hono();

// 요청 로깅 활성화
app.use('*', logger(console.log));

// 모든 라우트와 메서드에 대해 CORS 허용
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// 헬스 체크 엔드포인트
app.get("/make-server-860b2c16/health", (c) => {
  return c.json({ status: "ok" });
});

if (typeof Deno !== "undefined") {
  Deno.serve(app.fetch);
}

export default app;