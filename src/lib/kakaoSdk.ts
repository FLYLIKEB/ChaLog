import { logger } from './logger';

const PRIMARY_SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.5.0/kakao.min.js';
const FALLBACK_SDK_SRC = 'https://developers.kakao.com/sdk/js/kakao.min.js';

const isMobileDevice = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const attachScript = (src: string) => {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.defer = true;
  script.crossOrigin = 'anonymous';

  script.onerror = (error) => {
    logger.error('[카카오 SDK] 스크립트 로드 실패:', { error, src });
    if (src !== FALLBACK_SDK_SRC && !document.querySelector(`script[src="${FALLBACK_SDK_SRC}"]`)) {
      logger.info('[카카오 SDK] 대체 CDN으로 재시도:', { FALLBACK_SDK_SRC });
      attachScript(FALLBACK_SDK_SRC);
    }
  };

  script.onload = () => {
    logger.info('[카카오 SDK] 스크립트 로드 완료', { src });
  };

  document.head.appendChild(script);
  logger.info('[카카오 SDK] 스크립트 태그 추가 완료', { src });
};

export async function loadKakaoSdk(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (window.Kakao && typeof window.Kakao.init === 'function' && typeof window.Kakao.isInitialized === 'function') {
    logger.info('[카카오 SDK] 이미 로드됨');
    return;
  }

  const existingScript = document.querySelector('script[src*="kakao"]') as HTMLScriptElement | null;
  if (existingScript) {
    const readyState = (existingScript as unknown as { readyState?: string }).readyState;
    if (readyState === 'complete' || readyState === 'loaded') {
      logger.info('[카카오 SDK] 스크립트가 이미 로드 완료 상태입니다.');
    } else {
      logger.info('[카카오 SDK] 스크립트 태그가 이미 존재합니다. 로드 대기 중...');
    }
  } else {
    attachScript(PRIMARY_SDK_SRC);
  }

  const isMobile = isMobileDevice();
  const maxAttempts = isMobile ? 200 : 150;

  await new Promise<void>((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.Kakao && typeof window.Kakao.init === 'function' && typeof window.Kakao.isInitialized === 'function') {
        clearInterval(interval);
        logger.info(`[카카오 SDK] 로드 완료 (시도: ${attempts}, 모바일: ${isMobile})`);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        const msg = isMobile
          ? '카카오 SDK를 불러올 수 없습니다. 모바일 네트워크 연결을 확인하고 Wi-Fi로 전환하거나 페이지를 새로고침해주세요.'
          : '카카오 SDK를 불러올 수 없습니다. 네트워크 연결을 확인하고 페이지를 새로고침해주세요.';
        logger.error(`[카카오 SDK] 로드 시간 초과 (시도: ${attempts}, 모바일: ${isMobile})`);
        reject(new Error(msg));
      } else if (attempts % 20 === 0) {
        logger.debug(`[카카오 SDK] 로드 대기 중... (${attempts}/${maxAttempts})`);
      }
    }, 100);
  });
}

export async function initKakaoSdk(appKey: string): Promise<void> {
  if (!window.Kakao) throw new Error('카카오 SDK가 로드되지 않았습니다.');

  if (window.Kakao.isInitialized && window.Kakao.isInitialized()) {
    logger.info('[카카오 SDK] 이미 초기화됨');
    return;
  }

  try {
    logger.info('[카카오 SDK] 초기화 시도 중...');
    window.Kakao.init(appKey);
    logger.info('[카카오 SDK] 초기화 완료:', { isInitialized: window.Kakao.isInitialized() });
  } catch (error) {
    logger.error('[카카오 SDK] 초기화 실패:', { error });
    throw new Error('카카오 SDK 초기화에 실패했습니다. 카카오 앱 키를 확인해주세요.');
  }
}

export function getKakaoAccessToken(): string | null {
  return window.Kakao?.Auth?.getAccessToken?.() ?? null;
}
