import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Plus, ChevronRight, ChevronDown, TrendingUp } from 'lucide-react';
import { TeaCard } from '../TeaCard';
import { TeaListCard } from '../TeaListCard';
import { TeaCardSkeleton } from '../TeaCardSkeleton';
import { UserAvatar } from '../ui/UserAvatar';
import { Section } from '../ui/Section';
import { Tea, Seller } from '../../types';
import { CARD_WIDTH, CARD_CONTAINER_CLASSES, CARD_ITEM_WRAPPER_CLASSES, CARD_SKELETON_CONTAINER_CLASSES } from '../../constants';
import { cn } from '../ui/utils';

interface ExploreSectionProps {
  sectionsLoading: boolean;
  popularTeas: Tea[];
  newTeas: Tea[];
  curationTeas: Tea[];
  sellers: Seller[];
  popularTags: { name: string; noteCount: number }[];
  selectedFlavorTag: string | null;
  flavorTeas: Tea[];
  isFlavorLoading: boolean;
  onFlavorTagClick: (tagName: string) => void;
  trendingTeas?: Tea[];
  trendingCreators?: { id: number; name: string; profileImageUrl?: string | null; followerCount: number }[];
}

export function ExploreSection({
  sectionsLoading,
  popularTeas,
  newTeas,
  curationTeas,
  sellers,
  popularTags,
  selectedFlavorTag,
  flavorTeas,
  isFlavorLoading,
  onFlavorTagClick,
  trendingTeas,
  trendingCreators,
}: ExploreSectionProps) {
  const navigate = useNavigate();
  const [showAllRanking, setShowAllRanking] = useState(false);

  if (sectionsLoading) {
    return (
      <div className="space-y-8">
        {['사랑받는 차', '신규 차', '맞춤차'].map((title) => (
          <Section key={title} title={title} spacing="lg">
            <div className={CARD_SKELETON_CONTAINER_CLASSES}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={cn('shrink-0', CARD_WIDTH.WIDE)}>
                  <TeaCardSkeleton />
                </div>
              ))}
            </div>
          </Section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 요즘 인기 차 — 강조 배경 */}
      {trendingTeas && trendingTeas.length > 0 && (
        <div className="-mx-4 px-4 py-5 bg-gradient-to-b from-primary/[0.04] to-transparent rounded-b-3xl">
          <Section
            title="요즘 인기 차"
            description="최근 7일간 차록이 많은 인기 차예요."
            headerAction={
              <span className="inline-flex items-center gap-0.5 text-xs text-primary font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                실시간
              </span>
            }
            spacing="lg"
          >
            <div className={CARD_CONTAINER_CLASSES}>
              {trendingTeas.map((tea) => (
                <div key={tea.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE)}>
                  <TeaCard tea={tea} />
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* 인기 다우 — 컴팩트 가로 리스트 */}
      {trendingCreators && trendingCreators.length > 0 && (
        <Section title="인기 다우" spacing="md">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {trendingCreators.map((creator) => (
              <button
                key={creator.id}
                type="button"
                onClick={() => navigate(`/user/${creator.id}`)}
                className="shrink-0 flex items-center gap-2.5 pl-1 pr-3.5 py-1.5 rounded-full bg-card border border-border/40 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <UserAvatar
                  name={creator.name}
                  profileImageUrl={creator.profileImageUrl}
                  size="sm"
                />
                <div className="text-left min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">{creator.name}</span>
                  <span className="text-[10px] text-muted-foreground">구독자 {creator.followerCount}명</span>
                </div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* 사랑받는 차 */}
      <Section title="사랑받는 차" description="차록이 많은 순으로 모았어요." spacing="lg">
        {popularTeas.length > 0 ? (
          <div className="space-y-1.5">
            {popularTeas.slice(0, showAllRanking ? 10 : 5).map((tea, index) => (
              <TeaListCard key={tea.id} tea={tea} rank={index + 1} />
            ))}
            {popularTeas.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllRanking((v) => !v)}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAllRanking ? '접기' : `더보기 (${popularTeas.length - 5})`}
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showAllRanking && 'rotate-180')} />
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">등록된 차가 없습니다.</p>
        )}
      </Section>

      {/* 신규 차 */}
      <Section title="신규 차" description="최근에 새로 등록된 차예요." spacing="lg">
        {newTeas.length > 0 ? (
          <div className="space-y-1.5">
            {newTeas.slice(0, 5).map((tea) => (
              <TeaListCard key={tea.id} tea={tea} isNew />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">등록된 차가 없습니다.</p>
        )}
      </Section>

      {/* 향미로 탐색 — 배경 구분 */}
      <div className="-mx-4 px-4 py-5 bg-muted/30 dark:bg-muted/10">
        <Section title="향미로 탐색" description="좋아하는 향미를 선택하면 비슷한 차를 추천해드려요." spacing="lg">
          {popularTags.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {popularTags.slice(0, 15).map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => onFlavorTagClick(tag.name)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-medium transition-all',
                      selectedFlavorTag === tag.name
                        ? 'bg-primary text-primary-foreground shadow-sm scale-[1.02]'
                        : 'bg-card border border-border/50 text-foreground hover:border-primary/30 hover:shadow-sm',
                    )}
                  >
                    <span className="text-primary/70">#</span>
                    {tag.name}
                    {tag.noteCount > 0 && (
                      <span className="text-[11px] opacity-60">({tag.noteCount})</span>
                    )}
                  </button>
                ))}
              </div>
              {selectedFlavorTag && (
                <div className="mt-4">
                  {isFlavorLoading ? (
                    <div className={CARD_SKELETON_CONTAINER_CLASSES}>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className={cn('shrink-0', CARD_WIDTH.WIDE)}>
                          <TeaCardSkeleton />
                        </div>
                      ))}
                    </div>
                  ) : flavorTeas.length > 0 ? (
                    <div className="space-y-1.5">
                      {flavorTeas.map((tea) => (
                        <TeaListCard key={tea.id} tea={tea} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-3">#{selectedFlavorTag} 향미의 차가 없습니다.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-4">인기 향미를 불러오는 중...</p>
          )}
        </Section>
      </div>

      {/* 맞춤차 */}
      <Section title="맞춤차" description="다양한 기준으로 엄선한 차예요." spacing="lg">
        {curationTeas.length > 0 ? (
          <div className="space-y-1.5">
            {curationTeas.slice(0, 5).map((tea) => (
              <TeaListCard key={tea.id} tea={tea} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">엄선한 차가 없습니다.</p>
        )}
      </Section>

      {/* 찻집/다실 — 카드 스타일 */}
      <Section title="찻집/다실" description="차를 구매할 수 있는 찻집과 다실을 둘러보세요." spacing="lg">
        {sellers.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {sellers.map((seller) => (
              <button
                key={seller.name}
                onClick={() => navigate(`/teahouse/${encodeURIComponent(seller.name)}`)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground truncate w-full text-center">{seller.name}</span>
                <span className="text-[10px] text-muted-foreground">{seller.teaCount}종</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">등록된 찻집이 없습니다.</p>
        )}
      </Section>

      {/* 하단 CTA — 그라데이션 배너 */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={() => navigate('/teahouse/new')}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:from-primary/15 hover:to-primary/10 transition-all"
        >
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">찻집 신규추가</span>
          </div>
          <ChevronRight className="w-4 h-4 text-primary/60" />
        </button>
        <button
          type="button"
          onClick={() => navigate('/tea/new')}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:from-primary/15 hover:to-primary/10 transition-all"
        >
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">새 차 등록</span>
          </div>
          <ChevronRight className="w-4 h-4 text-primary/60" />
        </button>
      </div>
    </div>
  );
}
