import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, Check, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { teaSessionsApi } from '../lib/api';
import { TeaSession, TeaSessionSteep } from '../types';
import { toast } from 'sonner';
import { logger } from '../lib/logger';

export function SessionInProgress() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sessionId = id ? parseInt(id, 10) : NaN;

  const [session, setSession] = useState<TeaSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showSteepForm, setShowSteepForm] = useState(false);
  const [pendingDuration, setPendingDuration] = useState(0);
  const [aroma, setAroma] = useState('');
  const [taste, setTaste] = useState('');
  const [color, setColor] = useState('');
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (Number.isNaN(sessionId)) {
      navigate('/sessions');
      return;
    }

    const fetchSession = async () => {
      try {
        const data = await teaSessionsApi.getById(sessionId);
        setSession(data);
      } catch (error) {
        logger.error('Failed to fetch session:', error);
        toast.error('세션을 불러오는데 실패했습니다.');
        navigate('/sessions');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, navigate]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const handleCompleteSteep = () => {
    setPendingDuration(elapsedSeconds);
    setShowSteepForm(true);
    setElapsedSeconds(0);
    setIsRunning(false);
  };

  const handleSaveSteep = async () => {
    if (!session || Number.isNaN(sessionId)) return;

    const steepNumber = (session.steeps?.length ?? 0) + 1;

    try {
      setIsSaving(true);
      await teaSessionsApi.addSteep(sessionId, {
        steepNumber,
        steepDurationSeconds: pendingDuration,
        aroma: aroma.trim() || null,
        taste: taste.trim() || null,
        color: color.trim() || null,
        memo: memo.trim() || null,
      });

      const updated = await teaSessionsApi.getById(sessionId);
      setSession(updated);
      setShowSteepForm(false);
      setAroma('');
      setTaste('');
      setColor('');
      setMemo('');
      toast.success(`${steepNumber}탕 기록이 저장되었습니다.`);
    } catch (error) {
      logger.error('Failed to save steep:', error);
      toast.error(error instanceof Error ? error.message : '탕 기록 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToSummary = () => {
    navigate(`/session/${sessionId}/summary`);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const steeps = session?.steeps ?? [];
  const sortedSteeps = [...steeps].sort(
    (a, b) => (a.steepNumber ?? 0) - (b.steepNumber ?? 0)
  );

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (session.noteId) {
    return (
      <div className="min-h-screen">
        <Header showBack title="다회 세션" showProfile showLogo />
        <div className="p-4">
          <p className="text-muted-foreground text-center py-8">
            이 세션은 이미 노트로 발행되었습니다.
          </p>
          <Button className="w-full" onClick={() => navigate(`/note/${session.noteId}`)}>
            발행된 노트 보기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header showBack title={session.tea?.name ?? '다회 세션'} showProfile showLogo />

      <div className="p-4 pb-24 space-y-6">
        {/* 타이머 */}
        <section className="bg-card rounded-lg p-6 text-center">
          <p className="text-4xl font-mono font-bold tabular-nums mb-4">
            {formatTime(elapsedSeconds)}
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsRunning(!isRunning)}
              aria-label={isRunning ? '일시정지' : '시작'}
            >
              {isRunning ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setElapsedSeconds(0)}
              aria-label="리셋"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>
          <Button
            className="mt-4 w-full"
            onClick={handleCompleteSteep}
            disabled={elapsedSeconds === 0}
          >
            <Check className="w-4 h-4 mr-2" />
            탕 완료 ({formatTime(elapsedSeconds)})
          </Button>
        </section>

        {/* 탕 완료 폼 */}
        {showSteepForm && (
          <section className="bg-card rounded-lg p-4 border-2 border-primary">
            <h3 className="font-semibold mb-3">
              {(session.steeps?.length ?? 0) + 1}탕 기록 ({pendingDuration}초)
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">향</Label>
                <Input
                  placeholder="향 평가 (선택)"
                  value={aroma}
                  onChange={(e) => setAroma(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">맛</Label>
                <Input
                  placeholder="맛 평가 (선택)"
                  value={taste}
                  onChange={(e) => setTaste(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">색</Label>
                <Input
                  placeholder="색 평가 (선택)"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">메모</Label>
                <Input
                  placeholder="메모 (선택)"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSaveSteep} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : '저장'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSteepForm(false);
                    setElapsedSeconds(pendingDuration);
                    setAroma('');
                    setTaste('');
                    setColor('');
                    setMemo('');
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* 탕 목록 */}
        {sortedSteeps.length > 0 && (
          <section className="bg-card rounded-lg p-4">
            <h3 className="font-semibold mb-3">탕 기록 ({sortedSteeps.length}탕)</h3>
            <ul className="space-y-2">
              {sortedSteeps.map((s: TeaSessionSteep) => (
                <li
                  key={s.id}
                  className="flex justify-between items-start py-2 border-b border-border last:border-0"
                >
                  <div>
                    <span className="font-medium">{s.steepNumber}탕</span>
                    <span className="text-muted-foreground ml-2">{s.steepDurationSeconds}초</span>
                    {(s.aroma || s.taste || s.color) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {[s.aroma, s.taste, s.color].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Button variant="outline" className="w-full" onClick={handleGoToSummary}>
          세션 요약으로 이동
        </Button>
      </div>
    </div>
  );
}
