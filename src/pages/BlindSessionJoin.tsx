import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { blindSessionsApi } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';

export function BlindSessionJoin() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<{
    id: number;
    inviteCode: string;
    status: string;
    hostName: string;
    participantCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError('초대 코드가 없습니다.');
      setLoading(false);
      return;
    }
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const info = await blindSessionsApi.getByInviteCode(code);
        setSessionInfo(info);
        setError(null);
      } catch (err) {
        logger.error('Failed to fetch session info:', err);
        setError(err instanceof Error ? err.message : '세션 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [code, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated && code) {
      navigate(`/login?returnTo=${encodeURIComponent(`/blind/join/${code}`)}`);
    }
  }, [authLoading, isAuthenticated, code, navigate]);

  const handleJoin = async () => {
    if (!code || !isAuthenticated) return;

    try {
      setJoining(true);
      await blindSessionsApi.join(code);
      toast.success('참가되었습니다.');
      const info = sessionInfo ?? (await blindSessionsApi.getByInviteCode(code));
      navigate(`/blind/${info.id}/write`, { replace: true });
    } catch (err) {
      logger.error('Failed to join:', err);
      toast.error(err instanceof Error ? err.message : '참가에 실패했습니다.');
    } finally {
      setJoining(false);
    }
  };

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Header showBack title="블라인드 세션 참가" showProfile showLogo />
        <div className="p-4">
          <p className="text-destructive">{error}</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate('/')}>
            홈으로
          </Button>
        </div>
      </div>
    );
  }

  if (!sessionInfo) return null;

  return (
    <div className="min-h-screen">
      <Header showBack title="블라인드 세션 참가" showProfile showLogo />

      <div className="p-4 pb-24 space-y-6">
        <div className="bg-card rounded-lg p-4 border border-border">
          <h2 className="text-lg font-semibold mb-2">블라인드 테이스팅에 초대되었습니다</h2>
          <p className="text-sm text-muted-foreground mb-4">
            호스트: {sessionInfo.hostName}
          </p>
          <p className="text-sm text-muted-foreground">
            참가자 {sessionInfo.participantCount}명
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            참가 후 차 정보 없이 기록을 작성하세요. 세션 종료 후 결과를 비교할 수 있습니다.
          </p>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleJoin}
          disabled={joining || !isAuthenticated}
        >
          {joining ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              참가 중...
            </>
          ) : (
            '참가하기'
          )}
        </Button>
      </div>
    </div>
  );
}
