import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText } from 'lucide-react';
import { Header } from '../components/Header';
import { teaSessionsApi, blindSessionsApi, BlindSessionSummary } from '../lib/api';
import { TeaSession } from '../types';
import { toast } from 'sonner';
import { logger } from '../lib/logger';

type Tab = 'tea-session' | 'blind';

export function SessionHistory() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('tea-session');
  const [sessions, setSessions] = useState<TeaSession[]>([]);
  const [blindSessions, setBlindSessions] = useState<BlindSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sessionData, blindData] = await Promise.all([
          teaSessionsApi.getAll(),
          blindSessionsApi.getMySessions(),
        ]);
        setSessions(Array.isArray(sessionData) ? sessionData : []);
        setBlindSessions(Array.isArray(blindData) ? blindData : []);
      } catch (error) {
        logger.error('Failed to fetch sessions:', error);
        toast.error('세션 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
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
      <Header showBack title="세션 히스토리" showProfile showLogo />

      <div className="p-4 pb-24">
        {/* Tabs */}
        <div className="flex border-b border-border mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('tea-session')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === 'tea-session'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground'
            }`}
          >
            다회 세션
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('blind')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === 'blind'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground'
            }`}
          >
            블라인드 테이스팅
          </button>
        </div>

        {activeTab === 'tea-session' && (
          <>
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
          </>
        )}

        {activeTab === 'blind' && (
          <>
            {blindSessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>아직 블라인드 테이스팅 세션이 없습니다.</p>
                <button
                  type="button"
                  className="mt-4 text-primary underline"
                  onClick={() => navigate('/blind/new')}
                >
                  새 블라인드 테이스팅 시작하기
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {blindSessions.map((session) => (
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/blind/${session.id}`)}
                      className="w-full text-left bg-card rounded-lg p-4 border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">
                              {session.teaName ?? '비공개'}
                            </p>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full ${
                                session.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {session.status === 'active' ? '진행 중' : '종료됨'}
                            </span>
                            {session.isHost && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                호스트
                              </span>
                            )}
                          </div>
                          {session.teaType && (
                            <p className="text-xs text-muted-foreground mt-0.5">{session.teaType}</p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(session.createdAt)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            참가자 {session.participantCount}명 · 호스트: {session.hostName}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
