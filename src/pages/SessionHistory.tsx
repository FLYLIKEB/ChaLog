import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText } from 'lucide-react';
import { Header } from '../components/Header';
import { teaSessionsApi } from '../lib/api';
import { TeaSession } from '../types';
import { toast } from 'sonner';
import { logger } from '../lib/logger';

export function SessionHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TeaSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await teaSessionsApi.getAll();
        setSessions(Array.isArray(data) ? data : []);
      } catch (error) {
        logger.error('Failed to fetch sessions:', error);
        toast.error('세션 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleSessionClick = (session: TeaSession) => {
    if (session.noteId) {
      navigate(`/note/${session.noteId}`);
    } else {
      navigate(`/session/${session.id}/summary`);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="다회 세션 히스토리" showProfile showLogo />

      <div className="p-4 pb-24">
        {sessions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>아직 다회 세션이 없습니다.</p>
            <button
              type="button"
              className="mt-4 text-primary underline"
              onClick={() => navigate('/session/new')}
            >
              새 세션 시작하기
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => handleSessionClick(session)}
                  className="w-full text-left bg-card rounded-lg p-4 border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{session.tea?.name ?? '차'}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDate(session.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {session.steeps?.length ?? 0}탕
                        {session.noteId && (
                          <span className="ml-2 text-primary">· 노트 발행됨</span>
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
