import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, History } from 'lucide-react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { teasApi, teaSessionsApi } from '../lib/api';
import { Tea } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useAppMode } from '../contexts/AppModeContext';
import { logger } from '../lib/logger';
import { TeaSearchSection } from '../components/TeaSearchSection';

export function SessionNew() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { setSessionActive } = useAppMode();
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
    if (!preselectedTeaId) {
      const timer = setTimeout(() => teaInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, []);

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

  const selectedTeaData = selectedTea ? teas.find((t) => t.id === selectedTea) ?? null : null;

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
      setSessionActive(session.id);
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
        <TeaSearchSection
          inputRef={teaInputRef}
          searchQuery={searchQuery}
          onSearchChange={(value) => {
            setSearchQuery(value);
            setSelectedTea(null);
          }}
          selectedTea={selectedTea}
          filteredTeas={filteredTeas}
          selectedTeaData={selectedTeaData ? { name: selectedTeaData.name, type: selectedTeaData.type, year: selectedTeaData.year, seller: selectedTeaData.seller } : null}
          onSelectTea={(id, name) => {
            setSelectedTea(id);
            setSearchQuery(name);
          }}
          onClearTea={() => {
            setSelectedTea(null);
            setSearchQuery('');
          }}
          newTeaBasePath="/tea/new?returnTo=/session/new"
        />

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

        <button
          type="button"
          onClick={() => navigate('/sessions')}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="w-4 h-4" />
          이전 세션
        </button>
      </div>
    </div>
  );
}
