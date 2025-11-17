import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Header } from '../components/Header';
import { RatingSlider } from '../components/RatingSlider';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { mockTeas } from '../lib/mockData';
import { filterTeasByQuery } from '../lib/teaSearch';
import { toast } from 'sonner';

export function NewNote() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTeaId = searchParams.get('teaId');

  const [selectedTea, setSelectedTea] = useState(preselectedTeaId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [ratings, setRatings] = useState({
    richness: 3,
    strength: 3,
    smoothness: 3,
    clarity: 3,
    complexity: 3,
  });
  const [memo, setMemo] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const ratingFields: { key: keyof typeof ratings; label: string }[] = [
    { key: 'richness', label: '풍부함' },
    { key: 'strength', label: '강도' },
    { key: 'smoothness', label: '부드러움' },
    { key: 'clarity', label: '깨끗함' },
    { key: 'complexity', label: '복합성' },
  ];

  const filteredTeas = filterTeasByQuery(mockTeas, searchQuery);

  const selectedTeaData = mockTeas.find(t => t.id === selectedTea);

  useEffect(() => {
    if (preselectedTeaId) {
      const tea = mockTeas.find(t => t.id === preselectedTeaId);
      if (tea) setSearchQuery(tea.name);
    }
  }, [preselectedTeaId]);

  const handleSave = () => {
    if (!selectedTea) {
      toast.error('차를 선택해주세요.');
      return;
    }
    if (!memo.trim()) {
      toast.error('메모를 작성해주세요.');
      return;
    }

    // 실제 저장 대신 임시 성공 메시지 표시
    toast.success('기록이 저장되었습니다.');
    setTimeout(() => navigate('/my-notes'), 500);
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
              setSelectedTea('');
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
                    {tea.type} · {tea.seller}
                  </p>
                </button>
              ))}
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
        <Button onClick={handleSave} className="w-full">
          저장
        </Button>
      </div>
    </div>
  );
}
