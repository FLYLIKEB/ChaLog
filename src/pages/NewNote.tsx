import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Loader2, Plus } from 'lucide-react';
import { Header } from '../components/Header';
import { RatingSlider } from '../components/RatingSlider';
import { ImageUploader } from '../components/ImageUploader';
import { TagInput } from '../components/TagInput';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { teasApi, notesApi } from '../lib/api';
import { Tea, RatingSchema, RatingAxis } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { RATING_DEFAULT, RATING_MIN, RATING_MAX, NAVIGATION_DELAY } from '../constants';

export function NewNote() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedTeaId = searchParams.get('teaId');

  const [teas, setTeas] = useState<Tea[]>([]);
  const teasRef = useRef<Tea[]>([]);
  const [selectedTea, setSelectedTea] = useState<number | null>(
    preselectedTeaId ? parseInt(preselectedTeaId, 10) : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [schema, setSchema] = useState<RatingSchema | null>(null);
  const [axes, setAxes] = useState<RatingAxis[]>([]);
  const [axisValues, setAxisValues] = useState<Record<number, number>>({});
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const teaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 초기 로드 시 모든 차 목록 가져오기
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

    // 활성 스키마 가져오기
    const fetchSchema = async () => {
      try {
        const schemas = await notesApi.getActiveSchemas();
        if (Array.isArray(schemas) && schemas.length > 0) {
          const firstSchema = schemas[0];
          setSchema(firstSchema);
          
          // 스키마의 축 정보 가져오기
          const axesData = await notesApi.getSchemaAxes(firstSchema.id) as RatingAxis[];
          if (Array.isArray(axesData)) {
            setAxes(axesData);
            
            // 기본값 설정
            const initialValues: Record<number, number> = {};
            axesData.forEach((axis: RatingAxis) => {
              initialValues[axis.id] = RATING_DEFAULT;
            });
            setAxisValues(initialValues);
          }
        }
      } catch (error) {
        logger.error('Failed to fetch schema:', error);
        toast.error('평가 스키마를 불러오는데 실패했습니다.');
      }
    };
    fetchSchema();
  }, []);

  useEffect(() => {
    if (preselectedTeaId) {
      const teaId = parseInt(preselectedTeaId, 10);
      if (isNaN(teaId)) return;

      // useRef를 사용하여 최신 teas 배열 참조 (의존성 배열에 포함하지 않아도 됨)
      const tea = teasRef.current.find(t => t.id === teaId);
      if (tea) {
        setSelectedTea(teaId);
        setSearchQuery(tea.name);
      } else {
        // teas 목록에 없으면 개별적으로 가져오기 (새로 등록한 차일 수 있음)
        const fetchTea = async () => {
          try {
            const teaData = await teasApi.getById(teaId);
            if (teaData) {
              setTeas(prev => {
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

    if (!schema) {
      toast.error('평가 스키마를 불러오지 못했습니다.');
      return;
    }

    try {
      setIsSaving(true);
      
      // axisValues 배열 생성
      const axisValuesArray = axes
        .filter(axis => axisValues[axis.id] !== undefined)
        .map(axis => ({
          axisId: axis.id,
          value: Math.max(RATING_MIN, Math.min(RATING_MAX, axisValues[axis.id])),
        }));

      // overallRating 계산 (축 값들의 평균)
      const values = axisValuesArray.map(av => av.value);
      const calculatedOverallRating = values.length > 0
        ? values.reduce((sum, val) => sum + val, 0) / values.length
        : null;

      // memo 처리: 빈 문자열이나 공백만 있는 경우 null로 변환
      // 백엔드 API는 @IsOptional()로 memo를 선택적 필드로 허용하지만,
      // 빈 문자열 대신 null을 전송하는 것이 일관성 있음
      const processedMemo = memo && memo.trim() ? memo.trim() : null;

      await notesApi.create({
        teaId: selectedTea,
        schemaId: schema.id,
        overallRating: overallRating !== null ? overallRating : calculatedOverallRating,
        isRatingIncluded: true,
        axisValues: axisValuesArray,
        memo: processedMemo,
        images: images.length > 0 ? images : null,
        tags: tags.length > 0 ? tags : undefined,
        isPublic,
      });

      toast.success('기록이 저장되었습니다.');
      setTimeout(() => navigate('/my-notes'), NAVIGATION_DELAY);
    } catch (error) {
      logger.error('Failed to save note:', error);
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <Header showBack title="새 노트 작성" />
      
      <div className="p-4 space-y-6">
        {/* 차 선택 영역 */}
        <section className="bg-white rounded-lg p-4">
          <Label className="mb-2 block">차 선택</Label>
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
              className="fixed z-50 w-[calc(100%-2rem)] max-w-md bg-white border rounded-lg shadow-lg divide-y max-h-48 overflow-y-auto"
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
                  className="w-full text-left p-3 hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  <p className="text-sm">{tea.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {tea.type} · {tea.seller || '구매처 미상'}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* 검색 결과가 없을 때 새 차 추가 옵션 */}
          {searchQuery && !selectedTea && filteredTeas.length === 0 && (
            <div className="mt-2 p-4 border border-dashed border-gray-300 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-3">
                "{searchQuery}"에 대한 검색 결과가 없습니다.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigate(`/tea/new?returnTo=/note/new&searchQuery=${encodeURIComponent(searchQuery)}`);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                새 차로 등록하기
              </Button>
            </div>
          )}

          {selectedTeaData && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-900">{selectedTeaData.name}</span>
              </div>
              <div className="text-xs text-emerald-700 space-y-1">
                {selectedTeaData.year && <p>연도: {selectedTeaData.year}년</p>}
                <p>종류: {selectedTeaData.type}</p>
                {selectedTeaData.seller && <p>구매처: {selectedTeaData.seller}</p>}
              </div>
            </div>
          )}
        </section>

        {/* 평점 슬라이더 */}
        <section className="bg-white rounded-lg p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-4">평가</h3>
          <div className="space-y-0">
            {axes
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((axis, index) => (
                <React.Fragment key={axis.id}>
                  <RatingSlider
                    label={axis.nameKo}
                    value={axisValues[axis.id] ?? RATING_DEFAULT}
                    onChange={(value) =>
                      setAxisValues(prev => ({ ...prev, [axis.id]: value }))
                    }
                  />
                  {index < axes.length - 1 && (
                    <div className="border-t border-gray-100" />
                  )}
                </React.Fragment>
              ))}
          </div>
        </section>

        {/* 사진 업로드 */}
        <section className="bg-white rounded-lg p-4">
          <ImageUploader
            images={images}
            onChange={setImages}
            maxImages={5}
          />
        </section>

        {/* 태그 입력 */}
        <section 
          className="bg-white rounded-lg p-4"
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
        <section className="bg-white rounded-lg p-4">
          <Label className="mb-2 block">메모</Label>
          <Textarea
            placeholder="향·맛·여운에 대해 자유롭게 기록해보세요."
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={6}
          />
        </section>

        {/* 공개 여부 스위치 */}
        <section className="bg-white rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>공개 설정</Label>
              <p className="text-xs text-gray-500 mt-1">
                다른 사용자에게 이 노트를 공개합니다
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </section>

        {/* 저장 버튼 */}
        <Button 
          onClick={handleSave} 
          className="w-full"
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
