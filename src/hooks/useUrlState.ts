import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useUrlState<T extends string>(
  key: string,
  defaultValue: T,
): [T, (val: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = (searchParams.get(key) as T) ?? defaultValue;

  const setValue = useCallback(
    (val: T) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (val === defaultValue) {
          next.delete(key);
        } else {
          next.set(key, val);
        }
        return next;
      });
    },
    [key, defaultValue, setSearchParams],
  );

  return [value, setValue];
}
