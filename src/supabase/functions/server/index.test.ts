import { describe, expect, it } from 'vitest';
import app from './index';

describe('Edge 함수 서버', () => {
  it('헬스 체크 엔드포인트가 200을 반환한다', async () => {
    const response = await app.request('/make-server-860b2c16/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });
});

