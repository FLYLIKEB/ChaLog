import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Loader2, Plus } from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { teasApi, teaSessionsApi } from '../lib/api';
import { Tea } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';

export function SessionNew() {
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
  const [isCreating, setIsCreating] = useState(false);
  const teaInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (preselectedTeaId) {
      const teaId = parseInt(preselectedTeaId, 10);
      if (Number.isNaN(teaId)) return;

      const tea = teasRef.current.find((t) => t.id === teaId);
      if (tea) {
        setSelectedTea(teaId);
        setSearchQuery(tea.name);
      } else {
        const fetchTea = async () => {
          try {
            const teaData = await teasApi.getById(teaId);
            if (teaData) {
              setTeas((prev) => {
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

  const filteredTeas = teas.filter((tea) => {
    const query = searchQuery.toLowerCase();
    return (
      tea.name.toLowerCase().includes(query) ||
      tea.type.toLowerCase().includes(query) ||
      (tea.seller && tea.seller.toLowerCase().includes(query))
    );
  });

  const selectedTeaData = selectedTea ? teas.find((t) => t.id === selectedTea) : null;

  const handleStartSession = async () => {
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
      setIsCreating(true);
      const session = await teaSessionsApi.create({ teaId: selectedTea });
      toast.success('다회 세션이 시작되었습니다.');
      navigate(`/session/${session.id}`);
    } catch (error) {
      logger.error('Failed to create session:', error);
      toast.error(error instanceof Error ? error.message : '세션 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header showBack title="다회 모드 - 세션 시작" showProfile showLogo />

      <div className="p-4 pb-24 space-y-6">
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
                top: `${
                  teaInputRef.current ? teaInputRef.current.getBoundingClientRect().bottom + 8 : 0
                }px`,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              {filteredTeas.map((tea) => (
                <button
                  key={tea.id}
                  type="button"
                  onClick={() => {
                    setSelectedTea(tea.id);
                    setSearchQuery(tea.name);
                  }}
                  className="w-full text-left p-3 hover:bg-muted/50 transition-colors min-h-[44px]"
                >
                  <p className="text-sm">{tea.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tea.type}
                    {tea.seller && ` · ${tea.seller}`}
                    {tea.price != null && tea.price > 0 && ` · ${tea.price.toLocaleString()}원${tea.weight != null && tea.weight > 0 ? ` · ${tea.weight}g` : ''}`}
                    {!tea.seller && !(tea.price != null && tea.price > 0) && ' · 구매처 미상'}
                  </p>
                </button>
              ))}
            </div>
          )}

          {searchQuery && !selectedTea && filteredTeas.length === 0 && (
            <div className="mt-2 py-3 px-4 border border-dashed border-border rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">
                &quot;{searchQuery}&quot;에 대한 검색 결과가 없습니다.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigate(
                    `/tea/new?returnTo=/session/new&searchQuery=${encodeURIComponent(searchQuery)}`
                  );
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
                <span className="text-sm text-emerald-900 dark:text-emerald-100">
                  {selectedTeaData.name}
                </span>
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300 space-y-0.5">
                {selectedTeaData.year && <p>연도: {selectedTeaData.year}년</p>}
                <p>종류: {selectedTeaData.type}</p>
                {selectedTeaData.seller && <p>구매처: {selectedTeaData.seller}</p>}
              </div>
            </div>
          )}
        </section>

        <Button
          className="w-full"
          size="lg"
          onClick={handleStartSession}
          disabled={!selectedTea || isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              세션 생성 중...
            </>
          ) : (
            '세션 시작'
          )}
        </Button>
      </div>
    </div>
  );
}
