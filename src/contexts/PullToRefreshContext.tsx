import React, { createContext, useCallback, useRef, useContext } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

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

  const onRefresh = useCallback(async () => {
    await refreshCallbackRef.current?.();
  }, []);

  const {
    scrollContainerRef,
    pullDistance,
    isRefreshing,
    isReadyToRefresh,
    refreshMessage,
  } = usePullToRefresh(onRefresh);

  const registerRefresh = useCallback((callback: (() => Promise<void>) | undefined) => {
    refreshCallbackRef.current = callback;
  }, []);

  const showIndicator = pullDistance > 0 || isRefreshing;

  return (
    <PullToRefreshContext.Provider value={registerRefresh}>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
        {showIndicator && (
          <div
            className="flex flex-col items-center justify-center shrink-0 transition-all duration-300 ease-out animate-pull-refresh-in"
            style={{
              minHeight: Math.max(pullDistance, isRefreshing ? 88 : 48),
              paddingTop: 'calc(var(--header-spacer) + 12px)',
              paddingBottom: 12,
            }}
          >
            {isRefreshing ? (
              <div className="relative flex flex-col items-center gap-4 py-2 min-w-[200px]">
                {/* 톡톡 튀는 물방울들 */}
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  <span className="absolute left-8 top-2 w-2 h-2 rounded-full bg-primary/50 animate-droplet" />
                  <span className="absolute right-8 top-4 w-2.5 h-2.5 rounded-full bg-emerald-400/60 animate-droplet-1" />
                  <span className="absolute left-12 bottom-8 w-1.5 h-1.5 rounded-full bg-teal-400/60 animate-droplet-2" />
                  <span className="absolute right-12 bottom-6 w-2 h-2 rounded-full bg-primary/40 animate-droplet-delay" />
                  <span className="absolute left-1/2 -translate-x-1/2 top-0 w-1.5 h-1.5 rounded-full bg-amber-400/50 animate-droplet-1" />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-400/50 animate-droplet-2" />
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary/40 animate-droplet" />
                </div>
                <span className="inline-block text-3xl animate-teacup-calm relative z-10">🌿</span>
                <p className="text-sm text-center text-muted-foreground/90 relative z-10">
                  <span className={`font-pull-refresh ${refreshMessage.tea.color}`}>
                    {refreshMessage.tea.emoji} {refreshMessage.tea.name}
                  </span>
                  <span>
                    {/^[이처럼의]/.test(refreshMessage.phrase) ? '' : ' '}
                    {refreshMessage.phrase}
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
            )}
          </div>
        )}
        {children}
        </div>
      </div>
    </PullToRefreshContext.Provider>
  );
}
