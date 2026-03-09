import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { AxisStarRow } from '../components/AxisStarRow';
import { StarRating } from '../components/StarRating';
import { TagInput } from '../components/TagInput';
import { TemplateSelect } from '../components/TemplateSelect';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { blindSessionsApi, notesApi } from '../lib/api';
import { RatingSchema, RatingAxis } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { RATING_DEFAULT, RATING_MIN, RATING_MAX, NAVIGATION_DELAY } from '../constants';

export function BlindNoteWrite() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [schemas, setSchemas] = useState<RatingSchema[]>([]);
  const [pinnedSchemaIds, setPinnedSchemaIds] = useState<number[]>([]);
  const [selectedSchemaIds, setSelectedSchemaIds] = useState<number[]>([]);
  const [axes, setAxes] = useState<RatingAxis[]>([]);
  const [axisValues, setAxisValues] = useState<Record<number, number>>({});
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!id) return;

    const checkSession = async () => {
      try {
        await blindSessionsApi.getById(parseInt(id, 10));
        setSessionValid(true);
      } catch {
        setSessionValid(false);
        toast.error('세션을 찾을 수 없습니다.');
      }
    };
    checkSession();
  }, [id, isAuthenticated, navigate]);

  useEffect(() => {
    if (overallRating === null) return;
    const fetchSchemas = async () => {
      try {
        const res = await notesApi.getActiveSchemas();
        const list = res?.schemas ?? [];
        const pinned = res?.pinnedSchemaIds ?? [];
        if (list.length > 0) {
          setSchemas(list);
          setPinnedSchemaIds(pinned);
          setSelectedSchemaIds((prev) =>
            prev.length > 0 ? prev : [list[0].id]
          );
        }
      } catch (error) {
        logger.error('Failed to fetch schemas:', error);
        toast.error('평가 스키마를 불러오는데 실패했습니다.');
      }
    };
    fetchSchemas();
  }, [overallRating]);

  useEffect(() => {
    if (selectedSchemaIds.length === 0) {
      setAxes([]);
      setAxisValues({});
      return;
    }
    const fetchAxes = async () => {
      try {
        const axesBySchema = await Promise.all(
          selectedSchemaIds.map(async (schemaId) => {
            const axesData = (await notesApi.getSchemaAxes(schemaId)) as RatingAxis[];
            return Array.isArray(axesData) ? axesData : [];
          })
        );
        const allAxes = axesBySchema.flat();
        setAxes(allAxes);
        const initialValues: Record<number, number> = {};
        allAxes.forEach((axis) => {
          initialValues[axis.id] = RATING_DEFAULT;
        });
        setAxisValues(initialValues);
      } catch (error) {
        logger.error('Failed to fetch schema axes:', error);
        toast.error('평가 축 정보를 불러오는데 실패했습니다.');
      }
    };
    fetchAxes();
  }, [selectedSchemaIds.join(',')]);

  const handleSave = async () => {
    if (!id || !isAuthenticated) return;
    if (overallRating === null) {
      toast.error('1~5점 평점을 선택해주세요.');
      return;
    }

    const schemaIdsToSend =
      selectedSchemaIds.length > 0 ? selectedSchemaIds : (schemas[0] ? [schemas[0].id] : []);
    if (schemaIdsToSend.length === 0) {
      toast.error('최소 1개의 평가 스키마를 선택해주세요.');
      return;
    }

    try {
      setIsSaving(true);

      const axisValuesArray =
        axes.length > 0
          ? axes
              .filter((axis) => axisValues[axis.id] !== undefined)
              .map((axis) => ({
                axisId: axis.id,
                value: Math.max(RATING_MIN, Math.min(RATING_MAX, axisValues[axis.id])),
              }))
          : [];

      const processedMemo = memo && memo.trim() ? memo.trim() : null;

      await blindSessionsApi.submitNote(parseInt(id, 10), {
        schemaIds: schemaIdsToSend,
        overallRating,
        isRatingIncluded: true,
        axisValues: axisValuesArray,
        memo: processedMemo ?? null,
        tags: tags.length > 0 ? tags : undefined,
      });

      toast.success('기록이 제출되었습니다.');
      setTimeout(() => navigate(`/blind/${id}`), NAVIGATION_DELAY);
    } catch (error) {
      logger.error('Failed to submit blind note:', error);
      toast.error(error instanceof Error ? error.message : '제출에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (sessionValid === false) {
    return (
      <div className="min-h-screen">
        <Header showBack title="블라인드 기록 작성" showProfile showLogo />
        <div className="p-4">
          <p className="text-muted-foreground">세션을 찾을 수 없습니다.</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate('/')}>
            홈으로
          </Button>
        </div>
      </div>
    );
  }

  if (sessionValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="블라인드 기록 작성" showProfile showLogo />

      <div className="p-4 pb-24 space-y-6">
        <div className="bg-card rounded-lg p-3 border border-dashed border-muted-foreground/30">
          <p className="text-sm font-medium text-muted-foreground">블라인드 샘플</p>
          <p className="text-xs text-muted-foreground mt-1">
            차 정보 없이 맛과 향을 기록하세요. 세션 종료 후 결과를 비교할 수 있습니다.
          </p>
        </div>

        <section className="bg-card rounded-lg p-4">
          <Label className="mb-3 block text-base font-semibold">
            평점 <span className="text-destructive">*</span>
          </Label>
          <StarRating value={overallRating} onChange={setOverallRating} max={5} size="lg" />
        </section>

        {overallRating !== null && (
          <>
            <section className="bg-card rounded-lg p-4">
              <Label className="mb-2 block text-base font-semibold">테이스팅 템플릿</Label>
              {schemas.length > 0 ? (
                <TemplateSelect
                  schemas={schemas}
                  pinnedSchemaIds={pinnedSchemaIds}
                  onPinnedChange={setPinnedSchemaIds}
                  value={selectedSchemaIds}
                  onChange={(v) =>
                    setSelectedSchemaIds(Array.isArray(v) ? v : v != null ? [v] : [])
                  }
                  isAuthenticated={isAuthenticated}
                  multiple
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2">사용 가능한 템플릿이 없습니다.</p>
              )}
            </section>

            {selectedSchemaIds.length > 0 && axes.length > 0 && (
              <section className="bg-card rounded-lg p-4">
                <h3 className="text-base font-semibold mb-2">구체적 평가</h3>
                <div className="space-y-4">
                  {selectedSchemaIds.map((schemaId) => {
                    const schemaAxes = axes
                      .filter((a) => a.schemaId === schemaId)
                      .sort((a, b) => a.displayOrder - b.displayOrder);
                    const schema = schemas.find((s) => s.id === schemaId);
                    if (schemaAxes.length === 0) return null;
                    return (
                      <div
                        key={schemaId}
                        className="space-y-0 divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden"
                      >
                        {selectedSchemaIds.length > 1 && (
                          <div className="px-3 py-2 bg-muted/50 text-sm font-medium">
                            {schema?.nameKo ?? `템플릿 ${schemaId}`}
                          </div>
                        )}
                        {schemaAxes.map((axis) => (
                          <AxisStarRow
                            key={axis.id}
                            label={axis.nameKo}
                            value={axisValues[axis.id] ?? RATING_DEFAULT}
                            onChange={(value) =>
                              setAxisValues((prev) => ({ ...prev, [axis.id]: value }))
                            }
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="bg-card rounded-lg p-4">
              <TagInput tags={tags} onChange={setTags} maxTags={10} />
            </section>

            <section className="bg-card rounded-lg p-4">
              <Label className="mb-2 block">메모</Label>
              <Textarea
                placeholder="향·맛·여운에 대해 자유롭게 기록해보세요."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={6}
              />
            </section>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-background/80 backdrop-blur-sm z-40">
        <Button
          onClick={handleSave}
          className="w-full"
          disabled={isSaving || overallRating === null}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              제출 중...
            </>
          ) : (
            '제출'
          )}
        </Button>
      </div>
    </div>
  );
}
