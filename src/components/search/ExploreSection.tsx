import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { TeaCardSkeleton } from '../TeaCardSkeleton';
import { UserAvatar } from '../ui/UserAvatar';
import { Section } from '../ui/Section';
import { Tea, Seller } from '../../types';
import { CARD_WIDTH, CARD_SKELETON_CONTAINER_CLASSES } from '../../constants';
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

function TeaFlatRow({ tea, label }: { tea: Tea; label?: React.ReactNode }) {
  const navigate = useNavigate();
  const rating = Number(tea.averageRating);
  return (
    <button
      type="button"
      onClick={() => navigate(`/tea/${tea.id}`)}
      className="w-full flex items-center gap-3 py-3 border-b border-border/30 last:border-0 hover:opacity-70 active:opacity-50 transition-opacity text-left"
    >
      {label && <div className="shrink-0">{label}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{tea.name}</p>
        {(tea.type || tea.seller) && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {[tea.type, tea.seller].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        {rating > 0 && (
          <p className="text-xs font-medium text-foreground">★ {rating.toFixed(1)}</p>
        )}
        <p className="text-[11px] text-muted-foreground">{tea.reviewCount}개</p>
      </div>
    </button>
  );
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
    <div data-testid="explore-section" className="space-y-6">

      {/* 향미로 탐색 */}
      <Section
        title="향미로 탐색"
        spacing="md"
        headerAction={
          <button
            type="button"
            onClick={() => navigate('/tags')}
            className="text-xs font-medium text-primary hover:opacity-70 transition-opacity"
          >
            + 향미 추가
          </button>
        }
      >
        {popularTags.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {popularTags.slice(0, 15).map((tag, i, arr) => {
                const maxCount = arr[0]?.noteCount ?? 1;
                const ratio = maxCount > 0 ? (tag.noteCount ?? 0) / maxCount : 0;
                const sizeClass = ratio >= 0.6 ? 'text-lg' : ratio >= 0.3 ? 'text-base' : 'text-sm';
                return (
                <button
                  key={tag.name}
                  type="button"
                  onClick={() => onFlavorTagClick(tag.name)}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors font-medium',
                    sizeClass,
                    selectedFlavorTag === tag.name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-primary/25 text-foreground hover:bg-primary/5 hover:border-primary/50',
                  )}
                >
                  <span className={cn('text-xs', selectedFlavorTag === tag.name ? 'text-primary-foreground/70' : 'text-primary')}>#</span>
                  {tag.name}
                </button>
                );
              })}
            </div>
            {selectedFlavorTag && (
              <div className="mt-3">
                {isFlavorLoading ? (
                  <p className="text-xs text-muted-foreground py-2">불러오는 중...</p>
                ) : flavorTeas.length > 0 ? (
                  <div>
                    {flavorTeas.map((tea) => (
                      <TeaFlatRow key={tea.id} tea={tea} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-3">#{selectedFlavorTag} 향미의 차가 없습니다.</p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">인기 향미를 불러오는 중...</p>
        )}
      </Section>

      {/* 요즘 인기 차 */}
      {trendingTeas && trendingTeas.length > 0 && (
        <Section title="요즘 인기 차" spacing="md">
          <div>
            {trendingTeas.map((tea, index) => (
              <TeaFlatRow
                key={tea.id}
                tea={tea}
                label={
                  <span className={cn(
                    'w-5 text-sm font-bold tabular-nums text-center',
                    index === 0 ? 'text-primary' : 'text-muted-foreground/50',
                  )}>
                    {index + 1}
                  </span>
                }
              />
            ))}
          </div>
        </Section>
      )}

      {/* 사랑받는 차 */}
      <Section title="사랑받는 차" spacing="md">
        {popularTeas.length > 0 ? (
          <div>
            {popularTeas.slice(0, showAllRanking ? 10 : 5).map((tea, index) => (
              <TeaFlatRow
                key={tea.id}
                tea={tea}
                label={
                  <span className={cn(
                    'w-5 text-sm font-bold tabular-nums text-center',
                    index === 0 ? 'text-foreground' : 'text-muted-foreground/40',
                  )}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                }
              />
            ))}
            {popularTeas.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllRanking((v) => !v)}
                className="w-full flex items-center justify-center gap-1 pt-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAllRanking ? '접기' : `더보기 (${popularTeas.length - 5})`}
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showAllRanking && 'rotate-180')} />
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">등록된 차가 없습니다.</p>
        )}
      </Section>

      {/* 인기 다우 */}
      {trendingCreators && trendingCreators.length > 0 && (
        <Section title="인기 다우" spacing="md">
          <div className="grid grid-cols-2 gap-2">
            {trendingCreators.map((creator) => (
              <button
                key={creator.id}
                type="button"
                onClick={() => navigate(`/user/${creator.id}`)}
                className="flex items-center gap-2 p-3 rounded-xl border border-border/40 hover:bg-muted/40 active:opacity-70 transition-colors text-left"
              >
                <UserAvatar name={creator.name} profileImageUrl={creator.profileImageUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{creator.name}</p>
                  <p className="text-xs text-muted-foreground">구독자 {creator.followerCount}명</p>
                </div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* 신규 차 */}
      <Section title="신규 차" spacing="md">
        {newTeas.length > 0 ? (
          <div>
            {newTeas.slice(0, 5).map((tea) => (
              <TeaFlatRow
                key={tea.id}
                tea={tea}
                label={
                  <span className="text-[10px] font-bold text-primary">NEW</span>
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">등록된 차가 없습니다.</p>
        )}
      </Section>

      {/* 찻집/다실 */}
      <Section title="찻집/다실" spacing="md">
        {sellers.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {sellers.slice(0, 8).map((seller) => (
              <button
                key={seller.name}
                type="button"
                onClick={() => navigate(`/teahouse/${encodeURIComponent(seller.name)}`)}
                className="shrink-0 flex flex-col items-center gap-1.5 w-16 hover:opacity-70 active:opacity-50 transition-opacity"
              >
                <div className="w-12 h-12 rounded-full border border-border/50 flex items-center justify-center bg-muted/30">
                  <span className="text-base font-bold text-primary uppercase">{seller.name.charAt(0)}</span>
                </div>
                <span className="text-[11px] text-foreground truncate w-full text-center leading-tight">{seller.name}</span>
                <span className="text-[10px] text-muted-foreground">{seller.teaCount}종</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">등록된 찻집이 없습니다.</p>
        )}
      </Section>

      {/* 맞춤차 */}
      <Section title="맞춤차" spacing="md">
        {curationTeas.length > 0 ? (
          <div>
            {curationTeas.slice(0, 5).map((tea) => (
              <TeaFlatRow key={tea.id} tea={tea} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">엄선한 차가 없습니다.</p>
        )}
      </Section>

      {/* 하단 CTA */}
      <div className="border-t border-border/30 pt-4 space-y-0">
        <button
          type="button"
          onClick={() => navigate('/teahouse/new')}
          className="w-full flex items-center justify-between py-3.5 border-b border-border/30 hover:opacity-70 active:opacity-50 transition-opacity text-left"
        >
          <div className="flex items-center gap-3">
            <Store className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">찻집 신규추가</span>
          </div>
          <ChevronRight className="w-4 h-4 text-primary/40" />
        </button>
        <button
          type="button"
          onClick={() => navigate('/tea/new')}
          className="w-full flex items-center justify-between py-3.5 hover:opacity-70 active:opacity-50 transition-opacity text-left"
        >
          <div className="flex items-center gap-3">
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">새 차 등록</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        </button>
      </div>

    </div>
  );
}
