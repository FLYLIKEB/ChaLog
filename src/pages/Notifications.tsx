import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { notificationsApi } from '../lib/api';
import { Notification } from '../types';
import { toast } from 'sonner';
import { Bell, Heart, UserPlus, CheckCheck, Loader2 } from 'lucide-react';
import { UserAvatar } from '../components/ui/UserAvatar';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useRegisterRefresh } from '../contexts/PullToRefreshContext';

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}달 전`;
  return `${Math.floor(months / 12)}년 전`;
}

function NotificationIcon({ type }: { type: Notification['type'] }) {
  if (type === 'note_like') {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100">
        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
      <UserPlus className="w-4 h-4 text-green-600" />
    </div>
  );
}

function getNotificationText(notification: Notification): string {
  const actorName = notification.actor?.name ?? '누군가';
  if (notification.type === 'note_like') {
    return `${actorName}님이 내 노트에 좋아요를 눌렀습니다.`;
  }
  return `${actorName}님이 나를 팔로우하기 시작했습니다.`;
}

function getNotificationPath(notification: Notification): string | null {
  if (notification.type === 'note_like' && notification.targetId) {
    return `/note/${notification.targetId}`;
  }
  if (notification.type === 'follow') {
    return `/user/${notification.actorId}`;
  }
  return null;
}

export function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const LIMIT = 20;

  const fetchNotifications = useCallback(async (pageNum: number, append = false): Promise<boolean> => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const data = await notificationsApi.getAll(pageNum, LIMIT);

      if (append) {
        setNotifications((prev) => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }
      setTotal(data.total);

      const { count } = await notificationsApi.getUnreadCount();
      setUnreadTotal(count);
      return true;
    } catch {
      toast.error('알림을 불러오지 못했습니다.');
      return false;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchNotifications(1);
  }, [user, navigate, fetchNotifications]);

  const registerRefresh = useRegisterRefresh();
  useEffect(() => {
    registerRefresh(() => fetchNotifications(1));
    return () => registerRefresh(undefined);
  }, [registerRefresh, fetchNotifications]);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadTotal(0);
      toast.success('모든 알림을 읽음 처리했습니다.');
    } catch {
      toast.error('읽음 처리에 실패했습니다.');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await notificationsApi.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
        );
        setUnreadTotal((prev) => Math.max(0, prev - 1));
      } catch {
        // 읽음 처리 실패는 조용히 무시
      }
    }

    const path = getNotificationPath(notification);
    if (path) {
      navigate(path);
    }
  };

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    const loaded = await fetchNotifications(nextPage, true);
    if (loaded) setPage(nextPage);
  };

  const hasMore = notifications.length < total;

  return (
    <div className="min-h-screen">
      <Header title="알림" showBack showProfile />
      <main className="pb-20">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <Bell className="w-12 h-12" />
            <p className="text-sm">새로운 알림이 없습니다.</p>
          </div>
        ) : (
          <>
            {unreadTotal > 0 && (
              <div className="flex justify-end px-4 pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-muted-foreground flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  전체 읽음
                </Button>
              </div>
            )}
            <ul>
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-muted/30 transition-colors border-b border-border ${
                      !notification.isRead ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      <UserAvatar
                        name={notification.actor?.name ?? '?'}
                        profileImageUrl={notification.actor?.profileImageUrl}
                        size="sm"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        {getNotificationText(notification)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 mt-0.5">
                      <NotificationIcon type={notification.type} />
                    </div>
                    {!notification.isRead && (
                      <div className="shrink-0 mt-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-sm text-muted-foreground"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    '더 보기'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
