import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { TeaCard } from '../components/TeaCard';
import { EmptyState } from '../components/EmptyState';
import { BottomNav } from '../components/BottomNav';
import { teasApi } from '../lib/api';
import { Tea } from '../types';
import { Loader2, Store } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '../lib/logger';

export function ShopDetail() {
  const { name } = useParams<{ name: string }>();
  const [teas, setTeas] = useState<Tea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBySeller = useCallback(async () => {
    if (!name) return;
    try {
      setIsLoading(true);
      const data = await teasApi.getBySeller(name);
      setTeas(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error('Failed to fetch shop teas:', error);
      toast.error('샵 정보를 불러오는데 실패했습니다.');
      setTeas([]);
    } finally {
      setIsLoading(false);
    }
  }, [name]);

  useEffect(() => {
    fetchBySeller();
  }, [fetchBySeller]);

  if (!name) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="샵 상세" showBack />
        <EmptyState type="search" message="샵을 찾을 수 없습니다." />
        <BottomNav />
      </div>
    );
  }

  const displayName = name;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="샵 상세" showBack />

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
              <Store className="w-8 h-8 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-bold">{displayName}</h2>
                <p className="text-sm text-muted-foreground">{teas.length}종의 차</p>
              </div>
            </div>

            {teas.length > 0 ? (
              <div className="space-y-3">
                {teas.map((tea) => (
                  <TeaCard key={tea.id} tea={tea} />
                ))}
              </div>
            ) : (
              <EmptyState type="search" message="이 샵에 등록된 차가 없습니다." />
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
