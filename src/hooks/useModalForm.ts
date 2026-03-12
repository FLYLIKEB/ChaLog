import { useState, useCallback } from 'react';

export function useModalForm<T extends Record<string, unknown>>(
  initialData: T,
  onSubmit: (data: T) => Promise<void>,
) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      setOpen(false);
      setData(initialData);
    } finally {
      setIsLoading(false);
    }
  }, [data, initialData, onSubmit]);

  const reset = useCallback(() => {
    setData(initialData);
    setOpen(false);
  }, [initialData]);

  return { open, setOpen, data, setData, isLoading, handleSubmit, reset };
}
