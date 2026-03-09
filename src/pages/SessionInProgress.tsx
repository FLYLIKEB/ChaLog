import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, Check, Loader2, FileText, ChevronRight } from 'lucide-react';
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
  const [colorNote, setColorNote] = useState('');
  const [aromaProfile, setAromaProfile] = useState('');
  const [waterTemp, setWaterTemp] = useState('');
  const [bodyFeeling, setBodyFeeling] = useState('');
  const [rating, setRating] = useState<number | null>(null);
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
      const data = {
        v: 1 as const,
        color_note: colorNote.trim() || undefined,
        aroma_profile: aromaProfile.trim() || undefined,
        water_temp: waterTemp.trim() || undefined,
        body_feeling: bodyFeeling.trim() || undefined,
        rating: rating ?? undefined,
      };

      await teaSessionsApi.addSteep(sessionId, {
        steepNumber,
        steepDurationSeconds: pendingDuration,
        data,
      });

      const updated = await teaSessionsApi.getById(sessionId);
      setSession(updated);
      setShowSteepForm(false);
      setColorNote('');
      setAromaProfile('');
      setWaterTemp('');
      setBodyFeeling('');
      setRating(null);
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
    <div className="min-h-screen flex flex-col">
      <Header showBack title={session.tea?.name ?? '다회 세션'} showProfile showLogo />

      <div className="flex-1 flex flex-col p-4 pb-24">
        {/* 타이머 - 뷰포트 상하 중앙 정렬 */}
        <div className="flex-1 flex flex-col justify-center min-h-0 py-6">
          <section className="bg-card rounded-xl py-12 px-6 flex flex-col items-center text-center">
          <p className="text-6xl sm:text-5xl font-mono font-bold tabular-nums mb-8 mx-auto">
            {formatTime(elapsedSeconds)}
          </p>
          <div className="flex gap-6 justify-center items-center">
            <Button
              variant="outline"
              className="min-h-[72px] min-w-[72px] rounded-full p-0 shrink-0 touch-manipulation"
              onClick={() => setIsRunning(!isRunning)}
              aria-label={isRunning ? '일시정지' : '시작'}
            >
              {isRunning ? (
                <Pause className="w-9 h-9" />
              ) : (
                <Play className="w-9 h-9 ml-0.5" />
              )}
            </Button>
            <Button
              variant="outline"
              className="min-h-[72px] min-w-[72px] rounded-full p-0 shrink-0 touch-manipulation"
              onClick={() => setElapsedSeconds(0)}
              aria-label="리셋"
            >
              <RotateCcw className="w-8 h-8" />
            </Button>
          </div>
          <Button
            className="mt-8 w-full max-w-sm mx-auto min-h-[60px] text-lg font-semibold touch-manipulation flex justify-center items-center"
            size="lg"
            onClick={handleCompleteSteep}
            disabled={elapsedSeconds === 0}
          >
            <Check className="w-6 h-6 mr-2" />
            탕 완료 ({formatTime(elapsedSeconds)})
          </Button>
        </section>
        </div>

        <div className="space-y-6">
        {/* 탕 완료 폼 */}
        {showSteepForm && (
          <section className="bg-card rounded-lg p-4 border-2 border-primary">
            <h3 className="font-semibold mb-4">
              {(session.steeps?.length ?? 0) + 1}탕 기록 ({pendingDuration}초)
            </h3>
            <div className="space-y-5">
              {/* 감각: 수색의 변화와 향의 종류 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">감각 · 수색의 변화와 향의 종류</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">수색 변화</Label>
                    <Input
                      placeholder="예: 황금색, 진해짐"
                      value={colorNote}
                      onChange={(e) => setColorNote(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">향 종류</Label>
                    <Input
                      placeholder="예: 꽃향, 과일향"
                      value={aromaProfile}
                      onChange={(e) => setAromaProfile(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* 기술: 물 온도와 우려낸 시간 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">기술 · 물 온도와 우려낸 시간</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">물 온도</Label>
                    <Input
                      placeholder="예: 95°C, 끓는물"
                      value={waterTemp}
                      onChange={(e) => setWaterTemp(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">우려낸 시간</Label>
                    <div className="mt-1 py-2.5 px-3 rounded-lg bg-muted text-sm">
                      {pendingDuration}초
                    </div>
                  </div>
                </div>
              </div>

              {/* 주관: 몸의 반응 및 해당 탕의 만족도 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">주관 · 몸의 반응 및 해당 탕의 만족도</p>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">몸의 반응</Label>
                    <Input
                      placeholder="예: 따뜻함, 상쾌함"
                      value={bodyFeeling}
                      onChange={(e) => setBodyFeeling(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">만족도 (1~5)</Label>
                    <div className="flex gap-2 mt-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(n)}
                          className={`min-w-[44px] min-h-[44px] rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                            rating === n
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
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
                    setColorNote('');
                    setAromaProfile('');
                    setWaterTemp('');
                    setBodyFeeling('');
                    setRating(null);
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
                    {s.data?.v === 1 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {[
                          s.data.color_note && `수색 ${s.data.color_note}`,
                          s.data.aroma_profile && `향 ${s.data.aroma_profile}`,
                          s.data.water_temp && `물온도 ${s.data.water_temp}`,
                          s.data.body_feeling && `몸반응 ${s.data.body_feeling}`,
                          s.data.rating != null && `★${s.data.rating}`,
                          s.data.memo,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button
          type="button"
          onClick={handleGoToSummary}
          aria-label="세션 마무리하고 차록 쓰기 - 평가·메모를 남기고 차록으로 발행"
          className="w-full p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 active:scale-[0.98] transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">세션 마무리하고 차록 쓰기</p>
              <p className="text-sm text-muted-foreground mt-0.5">평가·메모를 남기고 차록으로 발행할 수 있어요</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </div>
        </button>
        </div>
      </div>
    </div>
  );
}
