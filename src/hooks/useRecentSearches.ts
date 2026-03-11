import { useState, useCallback } from 'react';
import { RECENT_SEARCHES_KEY, MAX_RECENT_SEARCHES } from '../constants';

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(searches: string[]): void {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    // localStorage 쓰기 실패 시 무시
  }
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(loadFromStorage);

  const addSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== trimmed);
      const next = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      saveToStorage(next);
      return next;
    });
  }, []);

  const removeSearch = useCallback((query: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== query);
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    saveToStorage([]);
    setRecentSearches([]);
  }, []);

  return { recentSearches, addSearch, removeSearch, clearAll };
}
