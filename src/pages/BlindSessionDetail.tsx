import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, FileText, Users, ChevronRight } from 'lucide-react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { blindSessionsApi } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';

type SessionData = {
  id: number;
  inviteCode: string;
  status: string;
  hostName: string;
  participantCount: number;
  isHost: boolean;
  totalRounds: number;
  currentRoundOrder: number | null;
  currentRoundId: number | null;
  participants: Array<{ userId: number; userName: string; hasNote: boolean; completedRounds: number[] }>;
  rounds: Array<{ id: number; roundOrder: number; status: string; tea?: { id: number; name: string; type: string; year?: number } | null }>;
  myCompletedRounds: number[];
  tea?: { id: number; name: string; type: string; year?: number } | null;
};

export function BlindSessionDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [advancingRound, setAdvancingRound] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!id) return;

    const fetchSession = async () => {
      try {
        const data = await blindSessionsApi.getById(parseInt(id, 10));
        setSession(data);
      } catch (err) {
        logger.error('Failed to fetch session:', err);
        toast.error(err instanceof Error ? err.message : '세션을 불러오는데 실패했습니다.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id, isAuthenticated, navigate]);

  const handleEndSession = async () => {
    if (!id || !session?.isHost) return;

    try {
      setEnding(true);
      await blindSessionsApi.endSession(parseInt(id, 10));
      toast.success('세션이 종료되었습니다.');
      setSession((prev) => (prev ? { ...prev, status: 'ended' } : null));
    } catch (err) {
      logger.error('Failed to end session:', err);
      toast.error(err instanceof Error ? err.message : '세션 종료에 실패했습니다.');
    } finally {
      setEnding(false);
    }
  };

  const handleNextRound = async () => {
    if (!id || !session?.isHost) return;

    try {
      setAdvancingRound(true);
      const result = await blindSessionsApi.nextRound(parseInt(id, 10));
      if (result.isLastRound) {
        toast.success('모든 라운드가 완료되었습니다. 세션을 종료해주세요.');
      } else {
        toast.success(`라운드 ${result.currentRound?.roundOrder}으로 이동했습니다.`);
      }
      // Refresh session data
      const updated = await blindSessionsApi.getById(parseInt(id, 10));
      setSession(updated);
    } catch (err) {
      logger.error('Failed to advance round:', err);
      toast.error(err instanceof Error ? err.message : '라운드 진행에 실패했습니다.');
    } finally {
      setAdvancingRound(false);
    }
  };

  const currentUserId = user?.id;
  const currentUserParticipant = session?.participants?.find(
    (p) => p.userId === currentUserId
  );
  const hasWrittenCurrentRound =
    session?.currentRoundId != null &&
    (currentUserParticipant?.completedRounds ?? []).includes(session.currentRoundId);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEnded = session.status === 'ended';
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/blind/join/${session.inviteCode}`;
  const allRoundsCompleted = session.currentRoundOrder === null && !isEnded;

  return (
    <div className="min-h-screen">
      <Header showBack title="블라인드 세션" showProfile showLogo />

      <div className="p-4 pb-24 space-y-6">
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">
              {isEnded ? '세션 종료됨' : `라운드 ${session.currentRoundOrder ?? '?'}/${session.totalRounds} 진행 중`}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            호스트: {session.hostName} · 참가자 {session.participantCount}명
          </p>
          {session.isHost && !isEnded && (
            <p className="text-xs text-muted-foreground mt-2 break-all">
              초대 링크: {inviteLink}
            </p>
          )}
        </div>

        {session.rounds && session.rounds.length > 0 && (
          <div className="bg-card rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold mb-2">라운드 현황</h3>
            <div className="space-y-1">
              {session.rounds.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-muted-foreground">라운드 {r.roundOrder}</span>
                  <div className="flex items-center gap-2">
                    {(isEnded || session.isHost) && r.tea && (
                      <span className="text-xs">{r.tea.name}</span>
                    )}
                    <span
                      className={
                        r.status === 'in_progress'
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : r.status === 'completed'
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/50'
                      }
                    >
                      {r.status === 'in_progress'
                        ? '진행 중'
                        : r.status === 'completed'
                        ? '완료'
                        : '대기'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {session.participants && session.participants.length > 0 && (
          <div className="bg-card rounded-lg p-4 border border-border">
            <h3 className="text-sm font-semibold mb-2">참가자</h3>
            <ul className="space-y-1">
              {session.participants.map((p) => (
                <li key={p.userId} className="text-sm flex justify-between">
                  <span>{p.userName}</span>
                  <span className="text-muted-foreground">
                    {session.totalRounds > 0
                      ? `${p.completedRounds.length}/${session.totalRounds} 완료`
                      : p.hasNote
                      ? '기록 완료'
                      : '대기 중'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!session.isHost && !isEnded && session.currentRoundId != null && (
          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate(`/blind/${id}/write?roundId=${session.currentRoundId}`)}
            disabled={hasWrittenCurrentRound}
          >
            {hasWrittenCurrentRound
              ? `라운드 ${session.currentRoundOrder} 기록 완료`
              : `라운드 ${session.currentRoundOrder} 기록 작성하기`}
          </Button>
        )}

        {session.isHost && !isEnded && (
          <div className="space-y-3">
            {session.currentRoundId != null && (
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={handleNextRound}
                disabled={advancingRound}
              >
                {advancingRound ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    진행 중...
                  </>
                ) : allRoundsCompleted ? (
                  '모든 라운드 완료'
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4 mr-2" />
                    다음 라운드로
                  </>
                )}
              </Button>
            )}
            <Button
              className="w-full"
              size="lg"
              variant="destructive"
              onClick={handleEndSession}
              disabled={ending}
            >
              {ending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  종료 중...
                </>
              ) : (
                '세션 종료'
              )}
            </Button>
          </div>
        )}

        {isEnded && (
          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate(`/blind/${id}/report`)}
          >
            <FileText className="w-4 h-4 mr-2" />
            비교 리포트 보기
          </Button>
        )}
      </div>
    </div>
  );
}
