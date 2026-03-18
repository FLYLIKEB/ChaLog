import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Copy, X, History } from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { teasApi, blindSessionsApi } from '../lib/api';
import { Tea } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useAppMode } from '../contexts/AppModeContext';
import { logger } from '../lib/logger';
import { TeaSearchSection } from '../components/TeaSearchSection';

export function BlindSessionNew() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { setBlindActive } = useAppMode();
  const [teas, setTeas] = useState<Tea[]>([]);
  const [selectedTeas, setSelectedTeas] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdSession, setCreatedSession] = useState<{
    id: number;
    inviteCode: string;
  } | null>(null);
  const teaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => teaInputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchTeas = async () => {
      try {
        const data = await teasApi.getAll();
        const teasArray = Array.isArray(data) ? data : [];
        setTeas(teasArray);
      } catch (error) {
        logger.error('Failed to fetch teas:', error);
      }
    };
    fetchTeas();
  }, []);

  const filteredTeas = searchQuery
    ? teas.filter((tea) => {
        const query = searchQuery.toLowerCase();
        return (
          tea.name.toLowerCase().includes(query) ||
          tea.type.toLowerCase().includes(query) ||
          (tea.seller && tea.seller.toLowerCase().includes(query))
        );
      })
    : [];

  const handleTeaSelect = (id: number) => {
    const tea = teas.find((t) => t.id === id);
    if (!tea) return;
    if (selectedTeas.includes(tea.id)) {
      toast.error('이미 추가된 차입니다.');
      return;
    }
    if (selectedTeas.length >= 10) {
      toast.error('최대 10개까지 추가할 수 있습니다.');
      return;
    }
    setSelectedTeas((prev) => [...prev, tea.id]);
    setSearchQuery('');
  };

  const handleRemoveTea = (teaId: number) => {
    setSelectedTeas((prev) => prev.filter((id) => id !== teaId));
  };

  const handleStartSession = async () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (selectedTeas.length === 0) {
      toast.error('차를 최소 1개 선택해주세요.');
      return;
    }

    try {
      setIsCreating(true);
      const session = await blindSessionsApi.create({ teaIds: selectedTeas });
      setBlindActive(session.id);
      setCreatedSession({ id: session.id, inviteCode: session.inviteCode });
      toast.success('블라인드 세션이 생성되었습니다.');
    } catch (error) {
      logger.error('Failed to create blind session:', error);
      toast.error(error instanceof Error ? error.message : '세션 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const inviteLink = createdSession
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/blind/join/${createdSession.inviteCode}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('초대 링크가 복사되었습니다.');
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  };

  const handleGoToSession = () => {
    if (createdSession) {
      navigate(`/blind/${createdSession.id}`);
    }
  };

  if (createdSession) {
    return (
      <div className="min-h-screen">
        <Header showBack title="블라인드 세션 생성" showProfile showLogo />

        <div className="p-4 pb-24 space-y-6">
          <div className="bg-card rounded-lg p-4 border border-border">
            <p className="text-sm text-muted-foreground mb-2">
              초대 링크를 공유하여 참가자를 초대하세요. 차 정보는 세션 종료 후에만 공개됩니다.
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={inviteLink}
                className="flex-1 text-sm"
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink} aria-label="링크 복사">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={handleGoToSession}>
            세션으로 이동
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="블라인드 테이스팅" showProfile showLogo />

      <div className="p-4 pb-24 space-y-6">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => navigate('/sessions')}
        >
          <History className="w-4 h-4 mr-2" />
          이전 세션 기록 보기
        </Button>

        <TeaSearchSection
          inputRef={teaInputRef}
          label="차 선택 (참가자에게 숨김, 최대 10개)"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTea={null}
          filteredTeas={filteredTeas}
          selectedTeaData={null}
          onSelectTea={(id) => handleTeaSelect(id)}
          newTeaBasePath="/tea/new?returnTo=/blind/new"
        />

        {selectedTeas.length > 0 && (
          <div className="space-y-2">
            {selectedTeas.map((teaId, index) => {
              const teaData = teas.find((t) => t.id === teaId);
              if (!teaData) return null;
              return (
                <div
                  key={teaId}
                  className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium w-5">
                      {index + 1}.
                    </span>
                    <div>
                      <p className="text-sm">{teaData.name}</p>
                      <p className="text-xs text-muted-foreground">{teaData.type}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTea(teaId)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    aria-label="제거"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleStartSession}
          disabled={selectedTeas.length === 0 || isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              세션 생성 중...
            </>
          ) : (
            `블라인드 세션 시작 (${selectedTeas.length}개 차)`
          )}
        </Button>
      </div>
    </div>
  );
}
