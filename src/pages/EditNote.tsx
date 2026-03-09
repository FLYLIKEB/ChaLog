import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Check, Loader2, Plus } from 'lucide-react';
import { Header } from '../components/Header';
import { AxisStarRow } from '../components/AxisStarRow';
import { StarRating } from '../components/StarRating';
import { AddTemplateModal } from '../components/AddTemplateModal';
import { ImageUploader } from '../components/ImageUploader';
import { TagInput } from '../components/TagInput';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { TemplateSelect } from '../components/TemplateSelect';
import { RatingGuideModal } from '../components/RatingGuideModal';
import { DetailFallback } from '../components/DetailFallback';
import { teasApi, notesApi } from '../lib/api';
import { Tea, Note, RatingSchema, RatingAxis } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { RATING_DEFAULT, RATING_MIN, RATING_MAX, NAVIGATION_DELAY } from '../constants';
import { TeaTypeBadge } from '../components/TeaTypeBadge';

export function EditNote() {
  const navigate = useNavigate();
  const { id } = useParams();
  const noteId = id ? parseInt(id, 10) : NaN;
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedTeaId = searchParams.get('teaId');
  const teasRef = useRef<Tea[]>([]);

  const [teas, setTeas] = useState<Tea[]>([]);
  const [selectedTea, setSelectedTea] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [schemas, setSchemas] = useState<RatingSchema[]>([]);
  const [pinnedSchemaIds, setPinnedSchemaIds] = useState<number[]>([]);
  const [selectedSchemaIds, setSelectedSchemaIds] = useState<number[]>([]);
  const [axes, setAxes] = useState<RatingAxis[]>([]);
  const [axisValues, setAxisValues] = useState<Record<number, number>>({});
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageThumbnails, setImageThumbnails] = useState<(string | null)[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [note, setNote] = useState<Note | null>(null);
  const teaInputRef = useRef<HTMLInputElement>(null);

  const handleTemplateAdded = (schema: RatingSchema) => {
    setSchemas(prev => [schema, ...prev]);
    setPinnedSchemaIds(prev => [schema.id, ...prev]);
    setSelectedSchemaIds(prev => (prev.includes(schema.id) ? prev : [schema.id, ...prev]));
  };

  // 초기 로드 시 모든 차 목록 가져오기
  useEffect(() => {
    const fetchTeas = async () => {
      try {
        const data = await teasApi.getAll();
        const teasArray = Array.isArray(data) ? data : [];
        setTeas(teasArray);
        teasRef.current = teasArray;
      } catch (error) {
        logger.error('Failed to fetch teas:', error);
      }
    };
    fetchTeas();
  }, []);

  // 스키마 목록 가져오기
  useEffect(() => {
    const fetchSchemas = async () => {
      try {
        const res = await notesApi.getActiveSchemas();
        const list = res?.schemas ?? [];
        const pinned = res?.pinnedSchemaIds ?? [];
        if (list.length > 0) {
          setSchemas(list);
          setPinnedSchemaIds(pinned);
        } else {
          logger.error('No active schema found');
          toast.error('활성 평가 스키마를 찾을 수 없습니다.');
        }
      } catch (error) {
        logger.error('Failed to fetch schemas:', error);
        toast.error('평가 스키마를 불러오는데 실패했습니다.');
      }
    };
    fetchSchemas();
  }, []);

  // NewTea에서 돌아올 때 teaId 처리
  useEffect(() => {
    if (preselectedTeaId) {
      const teaId = parseInt(preselectedTeaId, 10);
      if (isNaN(teaId)) return;

      // useRef를 사용하여 최신 teas 배열 참조
      const tea = teasRef.current.find(t => t.id === teaId);
      if (tea) {
        setSelectedTea(teaId);
        setSearchQuery(tea.name);
      } else {
        // teas 목록에 없으면 개별적으로 가져오기
        const fetchTea = async () => {
          try {
            const teaData = await teasApi.getById(teaId);
            if (teaData) {
              setTeas(prev => {
                if (prev.some(t => t.id === teaId)) return prev;
                const updated = [...prev, teaData as Tea];
                teasRef.current = updated;
                return updated;
              });
              setSelectedTea(teaId);
              setSearchQuery((teaData as Tea).name);
            }
          } catch (error) {
            logger.error('Failed to fetch tea:', error);
          }
        };
        fetchTea();
      }
    }
  }, [preselectedTeaId]);

  // 노트 데이터 불러오기
  useEffect(() => {
    const fetchNote = async () => {
      if (isNaN(noteId)) {
        toast.error('유효하지 않은 차록 ID입니다.');
        navigate('/my-notes');
        return;
      }

      try {
        setIsLoading(true);
        const noteData = await notesApi.getById(noteId);
        const normalizedNote = noteData as Note;

        // 권한 확인
        if (normalizedNote.userId !== user?.id) {
          toast.error('이 차록을 수정할 권한이 없습니다.');
          navigate(`/note/${noteId}`);
          return;
        }

        setNote(normalizedNote);
        setSelectedTea(normalizedNote.teaId);
        setOverallRating(normalizedNote.overallRating ?? null);

        // 스키마와 축 정보 설정 (schemaIds 우선, 없으면 schema.id)
        const noteSchemaIds = (normalizedNote as Note & { schemaIds?: number[] }).schemaIds;
        const schemaIdsToLoad =
          noteSchemaIds && noteSchemaIds.length > 0
            ? noteSchemaIds
            : normalizedNote.schema
              ? [normalizedNote.schema.id]
              : [];

        if (schemaIdsToLoad.length > 0) {
          setSelectedSchemaIds(schemaIdsToLoad);

          // 모든 스키마의 축 정보 가져오기
          try {
            const axesBySchema = await Promise.all(
              schemaIdsToLoad.map(async (schemaId) => {
                const axesData = (await notesApi.getSchemaAxes(schemaId)) as RatingAxis[];
                return Array.isArray(axesData) ? axesData : [];
              })
            );
            const allAxes = axesBySchema.flat();
            setAxes(allAxes);

            if (normalizedNote.axisValues && normalizedNote.axisValues.length > 0) {
              const initialValues: Record<number, number> = {};
              normalizedNote.axisValues.forEach((av) => {
                initialValues[av.axisId] = av.valueNumeric;
              });
              setAxisValues(initialValues);
            } else {
              const initialValues: Record<number, number> = {};
              allAxes.forEach((axis: RatingAxis) => {
                initialValues[axis.id] = RATING_DEFAULT;
              });
              setAxisValues(initialValues);
            }
          } catch (error) {
            logger.error('Failed to fetch axes:', error);
          }
        }
        
        setMemo(normalizedNote.memo || '');
        const noteImages = normalizedNote.images || [];
        setImages(noteImages);
        const noteThumbnails = normalizedNote.imageThumbnails || [];
        setImageThumbnails(
          noteThumbnails.length === noteImages.length
            ? noteThumbnails
            : noteImages.map(() => null)
        );
        setTags(normalizedNote.tags || []);
        setIsPublic(normalizedNote.isPublic);

        // 차 이름으로 검색 쿼리 설정
        setSearchQuery(normalizedNote.teaName);
      } catch (error: any) {
        logger.error('Failed to fetch note:', error);
        if (error?.statusCode === 403) {
          toast.error('이 차록을 수정할 권한이 없습니다.');
        } else if (error?.statusCode === 404) {
          toast.error('차록을 찾을 수 없습니다.');
        } else {
          toast.error('차록을 불러오는데 실패했습니다.');
        }
        navigate('/my-notes');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && user) {
      fetchNote();
    } else {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
    }
  }, [noteId, isAuthenticated, user, navigate]);

  // 선택된 스키마 변경 시 축 정보 가져오기 (템플릿 변경 시에만, 초기 로드는 fetchNote에서 처리)
  const initialSchemaSet = useRef(false);
  useEffect(() => {
    if (selectedSchemaIds.length === 0) {
      setAxes([]);
      setAxisValues({});
      return;
    }
    // 초기 로드 시에는 fetchNote에서 이미 axes/axisValues 설정함
    if (!initialSchemaSet.current && note) {
      initialSchemaSet.current = true;
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
        setAxisValues((prev) => {
          const next: Record<number, number> = {};
          allAxes.forEach((axis: RatingAxis) => {
            next[axis.id] = prev[axis.id] ?? RATING_DEFAULT;
          });
          return next;
        });
      } catch (error) {
        logger.error('Failed to fetch schema axes:', error);
        toast.error('평가 축 정보를 불러오는데 실패했습니다.');
      }
    };
    fetchAxes();
  }, [selectedSchemaIds.join(',')]);

  // 검색 필터링
  const filteredTeas = teas.filter(tea => {
    const query = searchQuery.toLowerCase();
    return (
      tea.name.toLowerCase().includes(query) ||
      tea.type.toLowerCase().includes(query) ||
      (tea.seller && tea.seller.toLowerCase().includes(query))
    );
  });

  const selectedTeaData = selectedTea ? teas.find(t => t.id === selectedTea) : null;

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!selectedTea) {
      toast.error('차를 선택해주세요.');
      return;
    }

    if (isNaN(noteId)) {
      toast.error('유효하지 않은 차록 ID입니다.');
      return;
    }

    const schemaIdsToSend = selectedSchemaIds.length > 0 ? selectedSchemaIds : [];
    if (schemaIdsToSend.length === 0) {
      toast.error('평가 스키마를 선택해주세요.');
      return;
    }

    try {
      setIsSaving(true);

      // axisValues 배열 생성
      const axisValuesArray = axes
        .filter(axis => axisValues[axis.id] !== undefined)
        .map(axis => ({
          axisId: axis.id,
          value: Math.max(
            RATING_MIN,
            Math.min(RATING_MAX, axisValues[axis.id]),
          ),
        }));

      const calculatedOverallRating =
        overallRating ??
        (axisValuesArray.length > 0
          ? axisValuesArray.reduce((sum, av) => sum + av.value, 0) /
            axisValuesArray.length
          : null);

      // memo 처리: 빈 문자열이나 공백만 있는 경우 null로 변환
      // 백엔드 API는 @IsOptional()로 memo를 선택적 필드로 허용하지만,
      // 빈 문자열 대신 null을 전송하는 것이 일관성 있음
      const processedMemo = memo && memo.trim() ? memo.trim() : null;

      await notesApi.update(noteId, {
        teaId: selectedTea,
        schemaIds: schemaIdsToSend,
        overallRating: calculatedOverallRating,
        isRatingIncluded: true,
        axisValues: axisValuesArray,
        memo: processedMemo,
        images: images.length > 0 ? images : null,
        imageThumbnails:
          images.length > 0 && imageThumbnails.length === images.length
            ? imageThumbnails.map((t, i) => t ?? images[i])
            : images.length > 0
              ? images
              : null,
        tags: tags.length > 0 ? tags : undefined,
        isPublic,
      });

      toast.success('차록이 수정되었습니다.');
      setTimeout(() => navigate(`/note/${noteId}`, { replace: true }), NAVIGATION_DELAY);
    } catch (error: any) {
      logger.error('Failed to update note:', error);
      if (error?.statusCode === 403) {
        toast.error('이 차록을 수정할 권한이 없습니다.');
      } else {
        toast.error(error instanceof Error ? error.message : '수정에 실패했습니다.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DetailFallback title="차록 수정">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DetailFallback>
    );
  }

  if (!note) {
    return (
      <DetailFallback 
        title="차록 수정"
        message="차록을 찾을 수 없거나 수정할 권한이 없습니다."
      />
    );
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="차록 수정" showProfile showLogo />
      
      <div className="p-4 pb-24 space-y-6">
        {/* 차 선택 영역 */}
        <section className="bg-card rounded-lg p-3">
          <Label className="mb-1.5 block text-sm">차 선택</Label>
          <Input
            ref={teaInputRef}
            type="text"
            placeholder="차 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedTea(null);
            }}
          />
          
          {searchQuery && !selectedTea && filteredTeas.length > 0 && (
            <div
              className="fixed z-50 w-[calc(100%-2rem)] max-w-md bg-card border border-border rounded-lg shadow-lg divide-y divide-border max-h-48 overflow-y-auto"
              style={{
                top: `${teaInputRef.current ? teaInputRef.current.getBoundingClientRect().bottom + 8 : 0}px`,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              {filteredTeas.map(tea => (
                <button
                  key={tea.id}
                  onClick={() => {
                    setSelectedTea(tea.id);
                    setSearchQuery(tea.name);
                  }}
                  className="w-full text-left p-3 hover:bg-muted/50 transition-colors min-h-[44px]"
                >
                  <p className="text-sm">{tea.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    {tea.type && <TeaTypeBadge type={tea.type} />}
                    {tea.seller && ` · ${tea.seller}`}
                    {tea.price != null && tea.price > 0 && ` · ${tea.price.toLocaleString()}원${tea.weight != null && tea.weight > 0 ? ` · ${tea.weight}g` : ''}`}
                    {!tea.seller && !(tea.price != null && tea.price > 0) && ' · 구매처 미상'}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* 검색 결과가 없을 때 새 차 추가 옵션 */}
          {searchQuery && !selectedTea && filteredTeas.length === 0 && (
            <div className="mt-2 py-3 px-4 border border-dashed border-border rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">
                "{searchQuery}"에 대한 검색 결과가 없습니다.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigate(`/tea/new?returnTo=/note/${noteId}/edit&searchQuery=${encodeURIComponent(searchQuery)}`);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                새 차로 등록하기
              </Button>
            </div>
          )}

          {selectedTeaData && (
            <div className="mt-2 py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm text-emerald-900 dark:text-emerald-100">{selectedTeaData.name}</span>
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300 space-y-0.5">
                {selectedTeaData.year && <p>연도: {selectedTeaData.year}년</p>}
                <p>종류: {selectedTeaData.type}</p>
                {selectedTeaData.seller && (
                  <p>
                    구매처:{' '}
                    <Link
                      to={`/teahouse/${encodeURIComponent(selectedTeaData.seller)}`}
                      className="text-primary hover:underline"
                    >
                      {selectedTeaData.seller}
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 1-5 평점 */}
        <section className="bg-card rounded-lg p-4">
          <Label className="mb-3 block text-base font-semibold text-foreground">
            평점 <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground mb-2">
            이 차에 몇 점을 주시겠어요?
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            같은 온도·시간에서 비교하면 일관된 평가가 가능해요.{' '}
            <RatingGuideModal />
          </p>
          <StarRating
            value={overallRating}
            onChange={setOverallRating}
            max={5}
            size="lg"
          />
        </section>

        {/* 테이스팅 템플릿 선택 */}
        <section className="bg-card rounded-lg p-4">
          <Label className="mb-2 block text-base font-semibold text-foreground">
            테이스팅 템플릿
          </Label>
          <p className="text-sm text-muted-foreground mb-2">
            템플릿을 선택하면 향·맛·여운 등을 기록할 수 있어요. 검색·핀 고정 가능.
          </p>
          {schemas.length > 0 ? (
            <TemplateSelect
              schemas={schemas}
              pinnedSchemaIds={pinnedSchemaIds}
              onPinnedChange={setPinnedSchemaIds}
              value={selectedSchemaIds}
              onChange={(v) => setSelectedSchemaIds(Array.isArray(v) ? v : v != null ? [v] : [])}
              onAddTemplate={() => setAddTemplateOpen(true)}
              isAuthenticated={isAuthenticated}
              multiple
            />
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              사용 가능한 템플릿이 없습니다.
            </p>
          )}
        </section>

        <AddTemplateModal
          open={addTemplateOpen}
          onOpenChange={setAddTemplateOpen}
          onSuccess={handleTemplateAdded}
        />

        {/* 구체적 평가 */}
        {selectedSchemaIds.length > 0 && axes.length > 0 && (
          <section className="bg-card rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="text-base font-semibold text-foreground">
                구체적 평가
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  1 ~ 5점
                </span>
                <RatingGuideModal
                  trigger={
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      축 설명 보기
                    </button>
                  }
                  schemaAxes={[...new Set(axes.map((a) => a.nameKo))]}
                />
              </div>
            </div>
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
                    {schemaAxes.map((axis) => (
                      <AxisStarRow
                        key={axis.id}
                        label={axis.nameKo}
                        description={axis.descriptionKo ?? undefined}
                        value={axisValues[axis.id] ?? RATING_DEFAULT}
                        onChange={(value) =>
                          setAxisValues((prev) => ({ ...prev, [axis.id]: value }))
                        }
                        minValue={axis.minValue}
                        maxValue={axis.maxValue}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 사진 업로드 */}
        <section className="bg-card rounded-lg p-4">
          <ImageUploader
            images={images}
            imageThumbnails={imageThumbnails}
            onChange={(newImages, newThumbnails) => {
              setImages(newImages);
              setImageThumbnails(newThumbnails);
            }}
            maxImages={5}
          />
        </section>

        {/* 태그 입력 */}
        <section 
          className="bg-card rounded-lg p-4"
          onKeyDown={(e) => {
            // 태그 입력 섹션에서 Enter 키가 폼 제출을 트리거하지 않도록 방지
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <TagInput
            tags={tags}
            onChange={setTags}
            maxTags={10}
          />
        </section>

        {/* 메모 입력 */}
        <section className="bg-card rounded-lg p-4">
          <Label className="mb-2 block">메모</Label>
          <Textarea
            placeholder="향·맛·여운에 대해 자유롭게 기록해보세요."
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={6}
          />
        </section>

        {/* 공개 여부 스위치 */}
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

      </div>

      {/* 저장 버튼 - 하단 고정 플로팅 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-background/80 dark:bg-background/90 backdrop-blur-sm z-40">
        <Button 
          onClick={handleSave} 
          className="w-full opacity-70 hover:opacity-100 transition-opacity"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            '저장'
          )}
        </Button>
      </div>
    </div>
  );
}

