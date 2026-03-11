import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { TeaCard } from '../components/TeaCard';
import { EmptyState } from '../components/EmptyState';
import { BottomNav } from '../components/BottomNav';
import { teasApi } from '../lib/api';
import { Tea } from '../types';
import { Loader2, Store, MapPin, Globe, Phone, Clock, ExternalLink, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';

export function ShopDetail() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [teas, setTeas] = useState<Tea[]>([]);
  const [sellerDetail, setSellerDetail] = useState<{
    address?: string | null;
    mapUrl?: string | null;
    websiteUrl?: string | null;
    phone?: string | null;
    description?: string | null;
    businessHours?: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBySeller = useCallback(async () => {
    if (!name) return;
    try {
      setIsLoading(true);
      const [teasData, detailData] = await Promise.all([
        teasApi.getBySeller(name),
        teasApi.getSellerByName(name).catch(() => null),
      ]);
      setTeas(Array.isArray(teasData) ? teasData : []);
      setSellerDetail(
        detailData
          ? {
              address: detailData.address,
              mapUrl: detailData.mapUrl,
              websiteUrl: detailData.websiteUrl,
              phone: detailData.phone,
              description: detailData.description,
              businessHours: detailData.businessHours,
            }
          : null,
      );
    } catch (error) {
      logger.error('Failed to fetch shop teas:', error);
      toast.error('찻집 정보를 불러오는데 실패했습니다.');
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
      <div className="min-h-screen pb-20">
        <Header title="찻집 상세" showBack showProfile />
        <EmptyState
          type="search"
          message="찻집을 찾을 수 없어요."
          action={{ label: '사색하기', onClick: () => navigate('/sasaek') }}
        />
        <BottomNav />
      </div>
    );
  }

  const displayName = name;

  return (
    <div className="min-h-screen pb-20">
      <Header title="찻집 상세" showBack showProfile />

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
              <Store className="w-8 h-8 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold">{displayName}</h2>
                <p className="text-sm text-muted-foreground">{teas.length}종의 차</p>
              </div>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => navigate(`/teahouse/${encodeURIComponent(displayName)}/edit`)}
                  className="shrink-0 p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="찻집 정보 수정"
                  title="찻집 정보 수정"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>

            {sellerDetail && (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                {sellerDetail.address && (
                  <a
                    href={
                      sellerDetail.mapUrl ||
                      `https://map.naver.com/v5/search/${encodeURIComponent(sellerDetail.address)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="wrap-break-word">{sellerDetail.address}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                )}
                {sellerDetail.websiteUrl && (
                  <a
                    href={sellerDetail.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <span className="truncate">웹사이트</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                )}
                {sellerDetail.phone && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 shrink-0" />
                    {sellerDetail.phone}
                  </p>
                )}
                {sellerDetail.businessHours && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 shrink-0" />
                    {sellerDetail.businessHours}
                  </p>
                )}
                {sellerDetail.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed pt-1 border-t border-border/50">
                    {sellerDetail.description}
                  </p>
                )}
              </div>
            )}

            {teas.length > 0 ? (
              <div className="space-y-3">
                {teas.map((tea) => (
                  <TeaCard key={tea.id} tea={tea} />
                ))}
              </div>
            ) : (
              <EmptyState
                type="search"
                message="이 찻집에 등록된 차가 없어요."
                action={{ label: '사색하기', onClick: () => navigate('/sasaek') }}
              />
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
