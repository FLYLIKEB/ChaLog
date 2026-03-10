import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Copy, X } from 'lucide-react';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { teasApi, blindSessionsApi } from '../lib/api';
import { Tea } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';

export function BlindSessionNew() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [teas, setTeas] = useState<Tea[]>([]);
  const [selectedTeas, setSelectedTeas] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdSession, setCreatedSession] = useState<{
    id: number;
    inviteCode: string;
  } | null>(null);
  const teaInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideInput = teaInputRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);
      if (!isInsideInput && !isInsideDropdown) {
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTeas = teas.filter((tea) => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    return (
      tea.name.toLowerCase().includes(query) ||
      tea.type.toLowerCase().includes(query) ||
      (tea.seller && tea.seller.toLowerCase().includes(query))
    );
  });

  const handleSelectTea = (tea: Tea) => {
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
        <section className="bg-card rounded-lg p-3">
          <Label className="mb-1.5 block text-sm">차 선택 (참가자에게 숨김, 최대 10개)</Label>
          <Input
            ref={teaInputRef}
            type="text"
            placeholder="차 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searchQuery && filteredTeas.length > 0 && (
            <div
              ref={dropdownRef}
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
                  onClick={() => handleSelectTea(tea)}
                  className="w-full text-left p-3 hover:bg-muted/50 transition-colors min-h-[44px]"
                >
                  <p className="text-sm">{tea.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tea.type}
                    {tea.seller && ` · ${tea.seller}`}
                  </p>
                </button>
              ))}
            </div>
          )}

          {searchQuery && filteredTeas.length === 0 && (
            <div className="mt-2 py-3 px-4 border border-dashed border-border rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">
                &quot;{searchQuery}&quot;에 대한 검색 결과가 없습니다.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(
                    `/tea/new?returnTo=/blind/new&searchQuery=${encodeURIComponent(searchQuery)}`
                  )
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                새 차로 등록하기
              </Button>
            </div>
          )}

          {selectedTeas.length > 0 && (
            <div className="mt-3 space-y-2">
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
        </section>

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
