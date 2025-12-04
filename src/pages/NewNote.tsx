import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Loader2, Plus } from 'lucide-react';
import { Header } from '../components/Header';
import { RatingSlider } from '../components/RatingSlider';
import { ImageUploader } from '../components/ImageUploader';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { teasApi, notesApi } from '../lib/api';
import { Tea } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { RATING_DEFAULT, RATING_FIELDS_COUNT, NAVIGATION_DELAY } from '../constants';

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
  const [ratings, setRatings] = useState({
    richness: RATING_DEFAULT,
    strength: RATING_DEFAULT,
    smoothness: RATING_DEFAULT,
    clarity: RATING_DEFAULT,
    complexity: RATING_DEFAULT,
  });
  const [memo, setMemo] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const ratingFields: { key: keyof typeof ratings; label: string }[] = [
    { key: 'richness', label: '풍부함' },
    { key: 'strength', label: '강도' },
    { key: 'smoothness', label: '부드러움' },
    { key: 'clarity', label: '깨끗함' },
    { key: 'complexity', label: '복합성' },
  ];

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

    try {
      setIsSaving(true);
      
      // 평균 평점 계산
      const averageRating = (
        ratings.richness +
        ratings.strength +
        ratings.smoothness +
        ratings.clarity +
        ratings.complexity
      ) / RATING_FIELDS_COUNT;

      await notesApi.create({
        teaId: selectedTea,
        rating: averageRating,
        ratings,
        memo: memo.trim() || undefined,
        images: images.length > 0 ? images : undefined,
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
            type="text"
            placeholder="차 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedTea(null);
            }}
          />
          
          {searchQuery && !selectedTea && filteredTeas.length > 0 && (
            <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
              {filteredTeas.map(tea => (
                <button
                  key={tea.id}
                  onClick={() => {
                    setSelectedTea(tea.id);
                    setSearchQuery(tea.name);
                  }}
                  className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
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
        <section className="bg-white rounded-lg p-4 space-y-4">
          <h3>평가</h3>
          {ratingFields.map(({ key, label }) => (
            <React.Fragment key={key}>
              <RatingSlider
                label={label}
                value={ratings[key]}
                onChange={(value) =>
                  setRatings(prev => ({ ...prev, [key]: value }))
                }
              />
            </React.Fragment>
          ))}
        </section>

        {/* 사진 업로드 */}
        <section className="bg-white rounded-lg p-4">
          <ImageUploader
            images={images}
            onChange={setImages}
            maxImages={5}
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
