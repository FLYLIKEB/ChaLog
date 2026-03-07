import { useState, useCallback, useRef, useEffect } from 'react';

const PULL_THRESHOLD = 72; // 배민 스타일: 이 거리 이상 당기면 새로고침
const MAX_PULL = 100; // 최대 당김 거리 (고무밴드 한계)
const RESISTANCE = 0.55; // 당김 저항 (0.5~0.6이 자연스러움)
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
  '한 잔 어떠신가요?',
  '차 한 잔의 여유를~',
  '처럼 담백하게 내려볼까요?',
  '한 잔에 마음을 가라앉히며',
  '이 펼쳐지는 향을 느껴보세요',
  '처럼 은은하게 우려내는 중',
  '의 깊은 맛을 새로고침합니다',
  '처럼 청아하게~',
  '한 수 담가 드릴까요?',
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

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState(pickRandomRefreshMessage);
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pullDistanceRef = useRef(0);
  const lastRefreshAtRef = useRef(0);
  const isPointerDownRef = useRef(false);

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

  const applyPull = useCallback((deltaY: number) => {
    if (deltaY > 0) {
      const raw = deltaY * RESISTANCE;
      const distance = raw < PULL_THRESHOLD
        ? raw
        : PULL_THRESHOLD + (raw - PULL_THRESHOLD) * 0.3;
      const clamped = Math.min(distance, MAX_PULL);
      setPullDistance(clamped);
      pullDistanceRef.current = clamped;
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  }, []);

  const finishPull = useCallback(() => {
    if (isRefreshing) return;
    if (pullDistanceRef.current >= PULL_THRESHOLD) {
      handleRefresh();
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
  }, [isRefreshing, handleRefresh]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing) return;
      if (el.scrollTop > 0) {
        setPullDistance(0);
        pullDistanceRef.current = 0;
        return;
      }
      const deltaY = e.touches[0].clientY - touchStartY.current;
      if (deltaY > 0 && deltaY > 8) e.preventDefault();
      applyPull(deltaY);
    };

    const handleTouchEnd = () => finishPull();

    // 데스크톱: 마우스 드래그로 당겨서 새로고침 (테스트/접근성)
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        isPointerDownRef.current = true;
        touchStartY.current = e.clientY;
        el.setPointerCapture(e.pointerId);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPointerDownRef.current || isRefreshing) return;
      if (e.pointerType !== 'mouse') return;
      if (el.scrollTop > 0) {
        setPullDistance(0);
        pullDistanceRef.current = 0;
        return;
      }
      const deltaY = e.clientY - touchStartY.current;
      applyPull(deltaY);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        isPointerDownRef.current = false;
        el.releasePointerCapture(e.pointerId);
        finishPull();
      }
    };

    // 휠: 데스크톱에서 스크롤 상단에서 위로 스크롤 시 새로고침 (쿨다운 적용)
    const handleWheel = (e: WheelEvent) => {
      if (isRefreshing) return;
      if (el.scrollTop === 0 && e.deltaY < 0) {
        e.preventDefault();
        handleRefresh();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointerleave', handlePointerUp);
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointerleave', handlePointerUp);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isRefreshing, handleRefresh, applyPull, finishPull]);

  return {
    scrollContainerRef,
    pullDistance,
    isRefreshing,
    isReadyToRefresh: pullDistance >= PULL_THRESHOLD,
    refreshMessage,
  };
}
