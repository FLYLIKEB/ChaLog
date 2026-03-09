import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { AxisStarRow } from '../components/AxisStarRow';
import { StarRating } from '../components/StarRating';
import { TemplateSelect } from '../components/TemplateSelect';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { teaSessionsApi, notesApi } from '../lib/api';
import { TeaSession, TeaSessionSteep, RatingSchema, RatingAxis } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { RATING_DEFAULT, RATING_MIN, RATING_MAX, NAVIGATION_DELAY } from '../constants';

export function SessionSummary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const sessionId = id ? parseInt(id, 10) : NaN;

  const [session, setSession] = useState<TeaSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [schemas, setSchemas] = useState<RatingSchema[]>([]);
  const [pinnedSchemaIds, setPinnedSchemaIds] = useState<number[]>([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState<number | null>(null);
  const [axes, setAxes] = useState<RatingAxis[]>([]);
  const [axisValues, setAxisValues] = useState<Record<number, number>>({});
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

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
    const fetchSchemas = async () => {
      try {
        const res = await notesApi.getActiveSchemas();
        const list = res?.schemas ?? [];
        const pinned = res?.pinnedSchemaIds ?? [];
        if (list.length > 0) {
          setSchemas(list);
          setPinnedSchemaIds(pinned);
          setSelectedSchemaId(pinned[0] ?? list[0]?.id ?? null);
        }
      } catch (error) {
        logger.error('Failed to fetch schemas:', error);
      }
    };
    fetchSchemas();
  }, []);

  useEffect(() => {
    if (!selectedSchemaId) {
      setAxes([]);
      setAxisValues({});
      return;
    }
    const fetchAxes = async () => {
      try {
        const axesData = (await notesApi.getSchemaAxes(selectedSchemaId)) as RatingAxis[];
        if (Array.isArray(axesData)) {
          setAxes(axesData);
          const initialValues: Record<number, number> = {};
          axesData.forEach((axis: RatingAxis) => {
            initialValues[axis.id] = RATING_DEFAULT;
          });
          setAxisValues(initialValues);
        }
      } catch (error) {
        logger.error('Failed to fetch schema axes:', error);
      }
    };
    fetchAxes();
  }, [selectedSchemaId]);

  const handlePublish = async () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!session || Number.isNaN(sessionId)) return;

    if (session.noteId) {
      toast.error('이미 노트로 발행된 세션입니다.');
      navigate(`/note/${session.noteId}`);
      return;
    }

    const schemaId = selectedSchemaId;
    if (!schemaId) {
      toast.error('평가 스키마를 선택해주세요.');
      return;
    }

    const axisValuesArray =
      axes.length > 0
        ? axes
            .filter((axis) => axisValues[axis.id] !== undefined)
            .map((axis) => ({
              axisId: axis.id,
              value: Math.max(RATING_MIN, Math.min(RATING_MAX, axisValues[axis.id])),
            }))
        : [];

    try {
      setIsPublishing(true);
      const { noteId } = await teaSessionsApi.publish(sessionId, {
        schemaId,
        overallRating: overallRating ?? null,
        isRatingIncluded: true,
        axisValues: axisValuesArray,
        memo: memo.trim() || null,
        isPublic,
      });

      toast.success('노트로 발행되었습니다.');
      setTimeout(() => navigate(`/note/${noteId}`), NAVIGATION_DELAY);
    } catch (error) {
      logger.error('Failed to publish session:', error);
      toast.error(error instanceof Error ? error.message : '노트 발행에 실패했습니다.');
    } finally {
      setIsPublishing(false);
    }
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
        <Header showBack title="세션 요약" showProfile showLogo />
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
      <Header showBack title={`${session.tea?.name ?? '세션'} 요약`} showProfile showLogo />

      <div className="p-4 pb-24 space-y-6">
        {/* 탕 기록 종합 */}
        <section className="bg-card rounded-lg p-4">
          <h3 className="font-semibold mb-3">탕 기록 ({sortedSteeps.length}탕)</h3>
          <ul className="space-y-2">
            {sortedSteeps.map((s: TeaSessionSteep) => (
              <li
                key={s.id}
                className="py-2 border-b border-border last:border-0 text-sm"
              >
                <span className="font-medium">{s.steepNumber}탕</span>
                <span className="text-muted-foreground ml-2">{s.steepDurationSeconds}초</span>
                {(s.aroma || s.taste || s.color) && (
                  <p className="text-muted-foreground mt-1">
                    {[s.aroma, s.taste, s.color].filter(Boolean).join(' · ')}
                  </p>
                )}
                {s.memo && <p className="text-muted-foreground mt-0.5">{s.memo}</p>}
              </li>
            ))}
          </ul>
        </section>

        {/* 평점 */}
        <section className="bg-card rounded-lg p-4">
          <Label className="mb-3 block text-base font-semibold">평점</Label>
          <StarRating
            value={overallRating}
            onChange={setOverallRating}
            max={5}
            size="lg"
          />
        </section>

        {/* 스키마 선택 */}
        <section className="bg-card rounded-lg p-4">
          <Label className="mb-2 block text-base font-semibold">테이스팅 템플릿</Label>
          {schemas.length > 0 ? (
            <TemplateSelect
              schemas={schemas}
              pinnedSchemaIds={pinnedSchemaIds}
              onPinnedChange={setPinnedSchemaIds}
              value={selectedSchemaId}
              onChange={setSelectedSchemaId}
              isAuthenticated={isAuthenticated}
            />
          ) : (
            <p className="text-sm text-muted-foreground py-2">사용 가능한 템플릿이 없습니다.</p>
          )}
        </section>

        {/* 구체적 평가 */}
        {selectedSchemaId && axes.length > 0 && (
          <section className="bg-card rounded-lg p-4">
            <h3 className="text-base font-semibold mb-2">구체적 평가</h3>
            <div className="space-y-0 divide-y divide-border/60">
              {axes
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((axis) => (
                  <AxisStarRow
                    key={axis.id}
                    label={axis.nameKo}
                    description={axis.descriptionKo ?? undefined}
                    value={axisValues[axis.id] ?? RATING_DEFAULT}
                    onChange={(value) =>
                      setAxisValues((prev) => ({ ...prev, [axis.id]: value }))
                    }
                  />
                ))}
            </div>
          </section>
        )}

        {/* 메모 */}
        <section className="bg-card rounded-lg p-4">
          <Label className="mb-2 block">메모</Label>
          <Textarea
            placeholder="세션에 대한 메모를 추가해보세요."
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
          />
        </section>

        {/* 공개 여부 */}
        <section className="bg-card rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>공개 설정</Label>
              <p className="text-xs text-muted-foreground mt-1">
                다른 사용자에게 이 차록을 공개합니다
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </section>

        <Button
          className="w-full"
          size="lg"
          onClick={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              발행 중...
            </>
          ) : (
            '노트로 발행'
          )}
        </Button>
      </div>
    </div>
  );
}
