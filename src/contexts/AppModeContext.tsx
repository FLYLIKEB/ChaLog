import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

type SessionState = {
  active: boolean;
  sessionId?: number;
};

export type AppMode = 'explore' | 'record';

type AppModeState = {
  sessionMode: SessionState;
  blindMode: SessionState;
  appMode: AppMode;
};

type AppModeContextType = AppModeState & {
  toggleSessionMode: () => void;
  toggleBlindMode: () => void;
  setSessionActive: (sessionId: number) => void;
  setBlindActive: (sessionId: number) => void;
  clearSession: () => void;
  clearBlind: () => void;
  setAppMode: (mode: AppMode) => void;
};

const STORAGE_KEY = 'chalog-app-mode';

const defaultState: AppModeState = {
  sessionMode: { active: false },
  blindMode: { active: false },
  appMode: 'explore',
};

const AppModeContext = createContext<AppModeContextType | null>(null);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<AppModeState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return defaultState;
      const parsed = JSON.parse(stored) as Partial<AppModeState>;
      return { ...defaultState, ...parsed };
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const toggleSessionMode = useCallback(() => {
    if (state.sessionMode.active && state.sessionMode.sessionId) {
      navigate(`/session/${state.sessionMode.sessionId}`);
    } else {
      navigate('/session/new');
    }
  }, [navigate, state.sessionMode]);

  const toggleBlindMode = useCallback(() => {
    if (state.blindMode.active && state.blindMode.sessionId) {
      navigate(`/blind/${state.blindMode.sessionId}`);
    } else {
      navigate('/blind/new');
    }
  }, [navigate, state.blindMode]);

  const setSessionActive = useCallback((sessionId: number) => {
    setState((prev) => ({ ...prev, sessionMode: { active: true, sessionId } }));
  }, []);

  const setBlindActive = useCallback((sessionId: number) => {
    setState((prev) => ({ ...prev, blindMode: { active: true, sessionId } }));
  }, []);

  const clearSession = useCallback(() => {
    setState((prev) => ({ ...prev, sessionMode: { active: false } }));
  }, []);

  const clearBlind = useCallback(() => {
    setState((prev) => ({ ...prev, blindMode: { active: false } }));
  }, []);

  const setAppMode = useCallback((mode: AppMode) => {
    setState((prev) => ({ ...prev, appMode: mode }));
  }, []);

  return (
    <AppModeContext.Provider
      value={{
        ...state,
        toggleSessionMode,
        toggleBlindMode,
        setSessionActive,
        setBlindActive,
        clearSession,
        clearBlind,
        setAppMode,
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
}
