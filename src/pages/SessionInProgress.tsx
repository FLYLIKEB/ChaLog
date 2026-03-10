import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, Check, Loader2, FileText, ChevronRight } from 'lucide-react';
import { Header } from '../components/Header';
import { BrewColorPicker, BrewColor, BREW_COLORS } from '../components/BrewColorPicker';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { teaSessionsApi } from '../lib/api';
import { TeaSession, TeaSessionSteep } from '../types';
import { toast } from 'sonner';
import { logger } from '../lib/logger';

const AROMA_OPTIONS = [
  '꽃향', '과일향', '풀향', '나무향', '견과향',
  '달콤한향', '곡물향', '훈연향', '약초향', '해양향',
] as const;

const BODY_FEELING_OPTIONS = [
  '따뜻함', '상쾌함', '편안함', '기운남', '나른함',
  '목넘김부드러움', '텁텁함', '시원함',
] as const;

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
  const [colorNote, setColorNote] = useState<BrewColor | null>(null);
  const [selectedAromas, setSelectedAromas] = useState<string[]>([]);
  const [waterTemp, setWaterTemp] = useState<number | null>(null);
  const [selectedBodyFeelings, setSelectedBodyFeelings] = useState<string[]>([]);
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
        color_note: colorNote ?? undefined,
        aroma_profile: selectedAromas.length > 0 ? selectedAromas.join(', ') : undefined,
        water_temp: waterTemp != null ? `${waterTemp}°C` : undefined,
        body_feeling: selectedBodyFeelings.length > 0 ? selectedBodyFeelings.join(', ') : undefined,
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
      setColorNote(null);
      setSelectedAromas([]);
      setWaterTemp(null);
      setSelectedBodyFeelings([]);
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
        {/* 타이머 */}
        <div className="flex-1 flex flex-col justify-center min-h-0 py-8">
          <section className="flex flex-col items-center text-center gap-10">
          <p
            className="text-7xl font-bold tabular-nums text-primary tracking-widest"
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            {formatTime(elapsedSeconds)}
          </p>

          <div className="flex gap-8 justify-center items-center">
            <button
              type="button"
              onClick={() => setElapsedSeconds(0)}
              className="w-[76px] h-[76px] rounded-full bg-muted/60 border border-border/40 flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
              aria-label="리셋"
            >
              <RotateCcw className="w-7 h-7 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className={`w-[96px] h-[96px] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all touch-manipulation ${
                isRunning
                  ? 'bg-muted border-2 border-border'
                  : 'bg-primary text-primary-foreground'
              }`}
              aria-label={isRunning ? '일시정지' : '시작'}
            >
              {isRunning ? (
                <Pause className="w-10 h-10 text-foreground" />
              ) : (
                <Play className="w-10 h-10 ml-1" />
              )}
            </button>
            <button
              type="button"
              onClick={handleCompleteSteep}
              disabled={elapsedSeconds === 0}
              className="w-[76px] h-[76px] rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center active:scale-95 transition-transform touch-manipulation disabled:opacity-30 disabled:active:scale-100"
              aria-label="탕 완료"
            >
              <Check className="w-7 h-7 text-primary" />
            </button>
          </div>

          {elapsedSeconds > 0 && (
            <p className="text-sm text-muted-foreground animate-pulse">
              탕 완료 버튼을 눌러 기록하세요
            </p>
          )}
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
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">수색 변화</Label>
                    <BrewColorPicker value={colorNote} onChange={setColorNote} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">향 종류</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {AROMA_OPTIONS.map((aroma) => (
                        <button
                          key={aroma}
                          type="button"
                          onClick={() =>
                            setSelectedAromas((prev) =>
                              prev.includes(aroma)
                                ? prev.filter((a) => a !== aroma)
                                : [...prev, aroma]
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation ${
                            selectedAromas.includes(aroma)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {aroma}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 기술: 물 온도와 우려낸 시간 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">기술 · 물 온도와 우려낸 시간</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      물 온도 {waterTemp != null && <span className="text-foreground font-semibold">{waterTemp}°C</span>}
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">50</span>
                      <input
                        type="range"
                        min={50}
                        max={100}
                        step={5}
                        value={waterTemp ?? 85}
                        onChange={(e) => setWaterTemp(parseInt(e.target.value, 10))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">100</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      우려낸 시간 <span className="text-foreground font-semibold">{pendingDuration}초</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPendingDuration((d) => Math.max(0, d - 5))}
                        className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-lg font-medium touch-manipulation active:scale-95 transition-transform"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={pendingDuration}
                        onChange={(e) => setPendingDuration(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="flex-1 text-center py-2 rounded-lg bg-muted text-sm font-medium [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setPendingDuration((d) => d + 5)}
                        className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-lg font-medium touch-manipulation active:scale-95 transition-transform"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 주관: 몸의 반응 및 해당 탕의 만족도 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">주관 · 몸의 반응 및 해당 탕의 만족도</p>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">몸의 반응</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {BODY_FEELING_OPTIONS.map((feeling) => (
                        <button
                          key={feeling}
                          type="button"
                          onClick={() =>
                            setSelectedBodyFeelings((prev) =>
                              prev.includes(feeling)
                                ? prev.filter((f) => f !== feeling)
                                : [...prev, feeling]
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation ${
                            selectedBodyFeelings.includes(feeling)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {feeling}
                        </button>
                      ))}
                    </div>
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
                    setColorNote(null);
                    setSelectedAromas([]);
                    setWaterTemp(null);
                    setSelectedBodyFeelings([]);
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
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {s.data.color_note && (() => {
                          const bc = BREW_COLORS.find((c) => c.value === s.data!.color_note);
                          return bc ? (
                            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                              <span
                                className="inline-block w-3.5 h-3.5 rounded-full border border-border/50 shrink-0"
                                style={{ backgroundColor: bc.hex }}
                              />
                              {bc.label}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">수색 {s.data!.color_note}</span>
                          );
                        })()}
                        {[
                          s.data.aroma_profile && `향 ${s.data.aroma_profile}`,
                          s.data.water_temp && `물온도 ${s.data.water_temp}`,
                          s.data.body_feeling && `몸반응 ${s.data.body_feeling}`,
                          s.data.rating != null && `★${s.data.rating}`,
                          s.data.memo,
                        ]
                          .filter(Boolean)
                          .map((text, i) => (
                            <span key={i} className="text-sm text-muted-foreground">
                              {i > 0 || s.data!.color_note ? ' · ' : ''}{text}
                            </span>
                          ))}
                      </div>
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
