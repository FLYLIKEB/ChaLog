import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../lib/api';

const POLL_INTERVAL_MS = 30_000;

type Subscriber = (count: number) => void;

const subscribers = new Set<Subscriber>();
let intervalId: ReturnType<typeof setInterval> | null = null;

async function fetchUnreadCount() {
  try {
    const res = await notificationsApi.getUnreadCount();
    subscribers.forEach((subscriber) => {
      subscriber(res.count);
    });
  } catch {
    // 폴링 실패는 조용히 무시
  }
}

function handleFocus() {
  void fetchUnreadCount();
}

function startPolling() {
  if (intervalId !== null) return;

  void fetchUnreadCount();
  intervalId = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
  window.addEventListener('focus', handleFocus);
}

function stopPolling() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    window.removeEventListener('focus', handleFocus);
  }
}

function subscribe(subscriber: Subscriber) {
  subscribers.add(subscriber);
  if (subscribers.size === 1) {
    startPolling();
  }
}

function unsubscribe(subscriber: Subscriber) {
  subscribers.delete(subscriber);
  if (subscribers.size === 0) {
    stopPolling();
  }
}

export function useNotificationCount() {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleUpdate: Subscriber = (count) => {
      setUnreadCount(count);
    };

    if (isAuthenticated) {
      subscribe(handleUpdate);
    } else {
      setUnreadCount(0);
    }

    return () => {
      unsubscribe(handleUpdate);
    };
  }, [isAuthenticated]);

  return unreadCount;
}

