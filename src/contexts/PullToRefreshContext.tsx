import React, { createContext, useCallback, useRef, useContext, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { BottomNavSpacer } from '../components/BottomNavSpacer';

type RegisterRefreshFn = (callback: (() => Promise<void>) | undefined) => void;

const PullToRefreshContext = createContext<RegisterRefreshFn | null>(null);

export function useRegisterRefresh() {
  const register = useContext(PullToRefreshContext);
  return useCallback(
    (callback: (() => Promise<void>) | undefined) => {
      register?.(callback);
    },
    [register]
  );
}

export function PullToRefreshProvider({ children }: { children: React.ReactNode }) {
  const refreshCallbackRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const [isPullDisabled, setIsPullDisabled] = useState(false);

  const onRefresh = useCallback(async () => {
    await refreshCallbackRef.current?.();
  }, []);

  const {
    scrollContainerRef,
    pullDistance,
    isRefreshing,
    isReadyToRefresh,
    refreshMessage,
  } = usePullToRefresh(onRefresh, isPullDisabled);

  const registerRefresh = useCallback((callback: (() => Promise<void>) | undefined) => {
    refreshCallbackRef.current = callback;
    setIsPullDisabled(callback === undefined);
  }, []);

  const showIndicator = !isPullDisabled && (pullDistance > 0 || isRefreshing);

  return (
    <PullToRefreshContext.Provider value={registerRefresh}>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'auto',
          } as React.CSSProperties}
        >
        <div
          className="flex flex-col items-center justify-center shrink-0 transition-all duration-200 ease-out overflow-hidden"
          style={{
            minHeight: showIndicator ? Math.max(pullDistance, isRefreshing ? 88 : 48) : 0,
            paddingTop: showIndicator ? 'calc(var(--header-spacer) + 12px)' : 0,
            paddingBottom: showIndicator ? 2 : 0,
          }}
        >
            {showIndicator && (isRefreshing ? (
              <div className="relative flex flex-col items-center gap-4 py-2 min-w-[200px]">
                {/* 찻잎 모양 - 도는 🌿 근처에 배치 */}
                <div className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-center">
                  <span className="absolute left-1/2 top-1/2 w-2.5 h-4 shape-tea-leaf bg-primary/50 animate-droplet -translate-x-12 -translate-y-4 -rotate-12" />
                  <span className="absolute left-1/2 top-1/2 w-3 h-5 shape-tea-leaf bg-primary/60 animate-droplet-1 translate-x-10 -translate-y-2 rotate-6" />
                  <span className="absolute left-1/2 top-1/2 w-2 h-3.5 shape-tea-leaf bg-primary/45 animate-droplet-2 -translate-x-8 translate-y-6 -rotate-[8deg]" />
                  <span className="absolute left-1/2 top-1/2 w-2.5 h-4 shape-tea-leaf bg-primary/40 animate-droplet-delay translate-x-10 translate-y-4 rotate-12" />
                  <span className="absolute left-1/2 top-1/2 w-2.5 h-4 shape-tea-leaf bg-primary/55 animate-droplet-1 -translate-x-1/2 -translate-y-8 -rotate-6" />
                  <span className="absolute left-1/2 top-1/2 w-3 h-4 shape-tea-leaf bg-primary/50 animate-droplet-2 translate-x-6 translate-y-0 rotate-12" />
                  <span className="absolute left-1/2 top-1/2 w-2 h-3.5 shape-tea-leaf bg-primary/40 animate-droplet -translate-x-6 translate-y-0 rotate-[-10deg]" />
                </div>
                <span className="inline-block text-3xl animate-teacup-calm relative z-10">🌿</span>
                <p className="text-sm text-center text-muted-foreground/90 relative z-10">
                  <span className={`font-pull-refresh ${refreshMessage.tea.color}`}>
                    {refreshMessage.tea.emoji} {refreshMessage.tea.name}
                  </span>
                  <span>
                    {/^[이처럼의]/.test(refreshMessage.phrase) ? '' : ' '}
                    {refreshMessage.phrase}
                    <span className="inline-block w-[4ch] overflow-hidden align-bottom">
                      <span className="animate-ellipsis">....</span>
                    </span>
                  </span>
                </p>
              </div>
            ) : (
              <div
                className={`flex flex-col items-center gap-2 transition-all duration-200 ease-out ${
                  isReadyToRefresh ? 'text-primary' : 'text-muted-foreground/80'
                }`}
              >
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ease-out ${
                    isReadyToRefresh ? 'rotate-180' : ''
                  }`}
                  strokeWidth={2}
                />
                <p className="text-xs font-medium">
                  {isReadyToRefresh ? '놓으면 새로고침' : '당겨서 새로고침'}
                </p>
              </div>
            ))}
          </div>
        {children}
        <BottomNavSpacer />
        </div>
      </div>
    </PullToRefreshContext.Provider>
  );
}
