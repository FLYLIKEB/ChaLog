import { useState, useCallback, useRef, useEffect } from 'react';

const PULL_THRESHOLD = 72; // 배민 스타일: 이 거리 이상 당기면 새로고침
const MAX_PULL = 100; // 최대 당김 거리 (고무밴드 한계)
const RESISTANCE = 0.55; // 당김 저항 (0.5~0.6이 자연스러움)
const PULL_CAPTURE_THRESHOLD = 12; // 이 거리 이상 당겼을 때만 pointer capture (헤더/하단바 클릭 방해 방지)
const REFRESH_COOLDOWN_MS = 2000;
const MIN_LOADING_DURATION_MS = 2000;
const TEA_TYPES = [
  { emoji: '🍵', name: '정산소종', color: 'text-amber-800' },
  { emoji: '🌿', name: '철관음', color: 'text-emerald-700' },
  { emoji: '🌸', name: '문산포종', color: 'text-rose-700' },
  { emoji: '🍂', name: '대홍포', color: 'text-amber-700' },
  { emoji: '💫', name: '동방미인', color: 'text-violet-700' },
  { emoji: '☕', name: '다즐링', color: 'text-amber-900' },
  { emoji: '🫖', name: '백호은침', color: 'text-teal-700' },
  { emoji: '🍃', name: '용정', color: 'text-green-700' },
  { emoji: '🌺', name: '동정미록', color: 'text-fuchsia-700' },
  { emoji: '🧋', name: '보이차', color: 'text-stone-700' },
  { emoji: '💚', name: '미지', color: 'text-emerald-700' },
  { emoji: '✨', name: '황차', color: 'text-amber-600' },
  { emoji: '💝', name: '백차', color: 'text-stone-600' },
  { emoji: '🌰', name: '흑차', color: 'text-stone-800' },
];

const PHRASES = [
  '한 잔 어떠신가요',
  '차 한 잔의 여유를~',
  '처럼 담백하게 내려볼까요',
  '한 잔에 마음을 가라앉히며',
  '이 펼쳐지는 향을 느껴보세요',
  '처럼 은은하게 우림하는 중',
  '의 깊은 맛을 새로고침합니다',
  '처럼 청아하게~',
  '한 잔 우림해드릴까요',
  '이 피어오르는 향기와 함께',
  '처럼 여유롭게 한 수',
  '의 진한 여운을 새로고침',
  '이 내려앉는 시간',
  '처럼 정갈하게 준비 중입니다',
  '한 잔의 여백을 채워갑니다',
];

function pickRandomRefreshMessage() {
  const tea = TEA_TYPES[Math.floor(Math.random() * TEA_TYPES.length)];
  const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
  return { tea, phrase };
}

function hapticLight() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

function hapticSuccess() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([8, 40, 8]);
  }
}

export function usePullToRefresh(onRefresh: () => Promise<void>, disabled = false) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState(pickRandomRefreshMessage);
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pullDistanceRef = useRef(0);
  const lastRefreshAtRef = useRef(0);
  const isPointerDownRef = useRef(false);
  const capturedPointerIdRef = useRef<number | null>(null);

  const handleRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshAtRef.current < REFRESH_COOLDOWN_MS) return;
    lastRefreshAtRef.current = now;

    hapticLight();
    const startedAt = Date.now();
    setIsRefreshing(true);
    setRefreshMessage(pickRandomRefreshMessage());
    try {
      await onRefresh();
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_LOADING_DURATION_MS - elapsed);
      setTimeout(() => {
        hapticSuccess();
        setIsRefreshing(false);
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }, remaining);
    }
  }, [onRefresh]);

  const rafIdRef = useRef<number | null>(null);
  const pendingDeltaRef = useRef<number | null>(null);
  const wheelAccumRef = useRef(0);

  const applyPull = useCallback((deltaY: number) => {
    if (disabled) return;
    if (deltaY > 0) {
      const raw = deltaY * RESISTANCE;
      const distance = raw < PULL_THRESHOLD
        ? raw
        : PULL_THRESHOLD + (raw - PULL_THRESHOLD) * 0.3;
      const clamped = Math.min(distance, MAX_PULL);
      if (Math.abs(pullDistanceRef.current - clamped) < 1) return; // 미세 변화 무시
      pullDistanceRef.current = clamped;
      pendingDeltaRef.current = clamped;
      if (rafIdRef.current == null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const v = pendingDeltaRef.current;
          if (v != null) {
            pendingDeltaRef.current = null;
            setPullDistance(v);
          }
        });
      }
    } else {
      if (pullDistanceRef.current === 0) return; // 이미 0이면 re-render 방지
      pullDistanceRef.current = 0;
      pendingDeltaRef.current = null;
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setPullDistance(0);
    }
  }, [disabled]);

  const finishPull = useCallback(() => {
    if (disabled) {
      setPullDistance(0);
      pullDistanceRef.current = 0;
      return;
    }
    if (isRefreshing) return;
    if (pullDistanceRef.current >= PULL_THRESHOLD) {
      handleRefresh();
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  }, [disabled, isRefreshing, handleRefresh]);

  useEffect(() => {
    if (disabled) {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  }, [disabled]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (disabled) return;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      // 두 손가락 이상(핀치 줌 등)이면 브라우저 기본 동작 허용
      if (e.touches.length > 1) return;
      if (el.scrollTop > 0) {
        if (pullDistanceRef.current > 0) {
          touchStartY.current = e.touches[0].clientY;
          setPullDistance(0);
          pullDistanceRef.current = 0;
        }
        return;
      }
      const deltaY = e.touches[0].clientY - touchStartY.current;
      if (deltaY > 0 && deltaY > 8) e.preventDefault();
      applyPull(deltaY);
    };

    const handleTouchEnd = () => finishPull();

    // 데스크톱: 마우스 드래그로 당겨서 새로고침 (테스트/접근성)
    // pointer capture는 실제 당김 동작이 감지된 후에만 적용 (헤더/하단바 클릭 방해 방지)
    const handlePointerDown = (e: PointerEvent) => {
      if (disabled) return;
      if (e.pointerType === 'mouse') {
        isPointerDownRef.current = true;
        touchStartY.current = e.clientY;
        // capture 하지 않음 - pointer move에서 당김 감지 시에만 capture
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (disabled || !isPointerDownRef.current || isRefreshing) return;
      if (e.pointerType !== 'mouse') return;
      if (el.scrollTop > 0) {
        if (pullDistanceRef.current > 0) {
          touchStartY.current = e.clientY;
          setPullDistance(0);
          pullDistanceRef.current = 0;
        }
        return;
      }
      const deltaY = e.clientY - touchStartY.current;
      if (deltaY > PULL_CAPTURE_THRESHOLD && capturedPointerIdRef.current === null) {
        capturedPointerIdRef.current = e.pointerId;
        el.setPointerCapture(e.pointerId);
      }
      applyPull(deltaY);
    };

    const releaseCapture = (pointerId: number) => {
      try {
        if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        isPointerDownRef.current = false;
        capturedPointerIdRef.current = null;
        releaseCapture(e.pointerId);
        finishPull();
      }
    };

    const handlePointerCancel = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        isPointerDownRef.current = false;
        capturedPointerIdRef.current = null;
        releaseCapture(e.pointerId);
        finishPull();
      }
    };

    // 휠: 데스크톱에서 스크롤 상단에서 위로 스크롤 시 새로고침 (쿨다운 적용)
    const handleWheel = (e: WheelEvent) => {
      if (disabled || isRefreshing) return;
      if (el.scrollTop === 0 && e.deltaY < 0) {
        wheelAccumRef.current += Math.abs(e.deltaY);
        if (wheelAccumRef.current > 40) {
          wheelAccumRef.current = 0;
          e.preventDefault();
          handleRefresh();
        }
      } else {
        wheelAccumRef.current = 0;
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointerleave', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerCancel);
    el.addEventListener('wheel', handleWheel, { passive: false });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isPointerDownRef.current) {
        isPointerDownRef.current = false;
        const pid = capturedPointerIdRef.current;
        if (pid != null) {
          capturedPointerIdRef.current = null;
          releaseCapture(pid);
        }
      }
    };

    const handleResize = () => {
      if (isPointerDownRef.current) {
        isPointerDownRef.current = false;
        const pid = capturedPointerIdRef.current;
        if (pid != null) {
          capturedPointerIdRef.current = null;
          releaseCapture(pid);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointerleave', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerCancel);
      el.removeEventListener('wheel', handleWheel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [disabled, isRefreshing, handleRefresh, applyPull, finishPull]);

  return {
    scrollContainerRef,
    pullDistance,
    isRefreshing,
    isReadyToRefresh: pullDistance >= PULL_THRESHOLD,
    refreshMessage,
  };
}
