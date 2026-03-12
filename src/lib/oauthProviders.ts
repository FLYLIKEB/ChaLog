import { authApi } from './api';
import { loadKakaoSdk, initKakaoSdk, getKakaoAccessToken } from './kakaoSdk';
import { logger } from './logger';

interface OAuthResult {
  access_token: string;
  user: {
    id: number;
    email: string | null;
    name: string;
    role?: 'user' | 'admin';
  };
}

export async function loginWithKakaoOAuth(code?: string): Promise<OAuthResult> {
  const kakaoAppKey = import.meta.env.VITE_KAKAO_APP_KEY;
  if (!kakaoAppKey) {
    throw new Error('카카오 앱 키가 설정되지 않았습니다. 환경 변수 VITE_KAKAO_APP_KEY를 확인해주세요.');
  }

  // 리다이렉트 코드 처리 경로
  if (code) {
    logger.info('[카카오 OAuth] 인증 코드로 액세스 토큰 교환 시작');
    const redirectUri = `${window.location.origin}/login`;

    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: kakaoAppKey,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      if (
        errorData.error === 'invalid_grant' ||
        errorData.error_description?.includes('authorization code not found')
      ) {
        logger.warn('[카카오 OAuth] 인증 코드가 이미 사용되었거나 만료되었습니다.');
        throw new Error('ALREADY_USED_CODE');
      }
      logger.error('[카카오 OAuth] 토큰 교환 실패:', errorData);
      throw new Error(`토큰 교환 실패: ${errorData.error_description || errorData.error || '알 수 없는 오류'}`);
    }

    const tokenData = await tokenResponse.json();
    const kakaoAccessToken = tokenData.access_token;
    if (!kakaoAccessToken) throw new Error('액세스 토큰을 받을 수 없습니다.');

    logger.info('[카카오 OAuth] 액세스 토큰 획득 완료, 백엔드로 전송 중...');
    const response = await authApi.loginWithKakao({ accessToken: kakaoAccessToken });
    logger.info('[카카오 OAuth] 백엔드 로그인 성공:', { userId: response.user?.id });
    return response;
  }

  // SDK 직접 로그인 경로
  logger.info('[카카오 OAuth] SDK 로그인 시작');
  await loadKakaoSdk();
  await initKakaoSdk(kakaoAppKey);

  const hasAuthorize = !!(window.Kakao?.Auth && typeof window.Kakao.Auth.authorize === 'function');
  const hasLogin = !!(window.Kakao?.Auth && typeof window.Kakao.Auth.login === 'function');

  if (!window.Kakao?.Auth || (!hasAuthorize && !hasLogin)) {
    throw new Error('카카오 로그인 API를 사용할 수 없습니다. 페이지를 새로고침해주세요.');
  }

  if (hasAuthorize) {
    const redirectUri = `${window.location.origin}/login`;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (navigator as unknown as { standalone: boolean }).standalone);

    if (isStandalone) {
      const kakaoAuthUrl =
        `https://kauth.kakao.com/oauth/authorize` +
        `?client_id=${kakaoAppKey}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=profile_nickname,account_email`;
      window.location.href = kakaoAuthUrl;
      throw new Error('REDIRECT');
    }

    window.Kakao.Auth.authorize({
      redirectUri,
      scope: 'profile_nickname,account_email',
      throughTalk: false,
    });
    throw new Error('REDIRECT');
  }

  // 구버전 SDK login 방식
  await new Promise<void>((resolve, reject) => {
    window.Kakao.Auth.login({
      success: (authObj) => {
        logger.info('[카카오 OAuth] SDK login 성공:', { hasAuthObj: !!authObj });
        resolve();
      },
      fail: (err) => {
        logger.error('[카카오 OAuth] SDK login 실패:', { err });

        let errorMessage = '카카오 로그인에 실패했습니다.';
        if (err?.error === 'KOE009') {
          errorMessage = `카카오 개발자 콘솔 설정이 완료되지 않았습니다.\n현재 도메인: ${window.location.origin}`;
        } else if (err?.error === 'KOE006') {
          errorMessage = '카카오 앱 키가 올바르지 않습니다. 환경 변수 VITE_KAKAO_APP_KEY를 확인해주세요.';
        } else if (err?.error === 'KOE101') {
          errorMessage = `Redirect URI가 등록되지 않았습니다. 카카오 개발자 콘솔에서 "${window.location.origin}"을 등록하세요.`;
        } else if (err?.error_description) {
          errorMessage = err.error_description;
        }

        reject(new Error(errorMessage));
      },
    });
  });

  const kakaoAccessToken = getKakaoAccessToken();
  if (!kakaoAccessToken) throw new Error('카카오 액세스 토큰을 가져올 수 없습니다.');

  logger.info('[카카오 OAuth] 액세스 토큰 획득 완료, 백엔드로 전송 중...');
  const response = await authApi.loginWithKakao({ accessToken: kakaoAccessToken });
  logger.info('[카카오 OAuth] 백엔드 로그인 성공:', { userId: response.user?.id });
  return response;
}

export async function loginWithGoogleOAuth(accessToken: string): Promise<OAuthResult> {
  const response = await authApi.loginWithGoogle({ accessToken });
  return response;
}
