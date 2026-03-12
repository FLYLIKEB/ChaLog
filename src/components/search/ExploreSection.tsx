import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Plus } from 'lucide-react';
import { TeaCard } from '../TeaCard';
import { TeaRankingCard } from '../TeaRankingCard';
import { TeaNewCard } from '../TeaNewCard';
import { TeaCardSkeleton } from '../TeaCardSkeleton';
import { Button } from '../ui/button';
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
}: ExploreSectionProps) {
  const navigate = useNavigate();

  if (sectionsLoading) {
    return (
      <div className="space-y-8">
        {['🏆 사랑받는 차', '🆕 신규 차', '✨ 맞춤차'].map((title) => (
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
    <div className="space-y-8">
      <Section title="🏆 사랑받는 차" description="차록이 많은 순으로 사랑받는 차를 모았어요." spacing="lg">
        {popularTeas.length > 0 ? (
          <div className={CARD_CONTAINER_CLASSES}>
            {popularTeas.slice(0, 10).map((tea, index) => (
              <div key={tea.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE)}>
                <TeaRankingCard tea={tea} rank={index + 1} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">등록된 차가 없습니다.</p>
        )}
      </Section>

      <Section title="🆕 신규 차" description="최근에 차멍에 새로 등록된 차예요." spacing="lg">
        {newTeas.length > 0 ? (
          <div className={CARD_CONTAINER_CLASSES}>
            {newTeas.slice(0, 3).map((tea) => (
              <div key={tea.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE)}>
                <TeaNewCard tea={tea} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">등록된 차가 없습니다.</p>
        )}
      </Section>

      <Section title="🏷️ 향미로 탐색" description="좋아하는 향미를 선택하면 비슷한 차를 추천해드려요." spacing="lg">
        {popularTags.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              {popularTags.slice(0, 15).map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  onClick={() => onFlavorTagClick(tag.name)}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                    selectedFlavorTag === tag.name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border/60 bg-background hover:bg-muted/80',
                  )}
                >
                  #{tag.name}
                  {tag.noteCount > 0 && <span className="text-xs opacity-70">({tag.noteCount})</span>}
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
                  <div className={CARD_CONTAINER_CLASSES}>
                    {flavorTeas.map((tea) => (
                      <div key={tea.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE)}>
                        <TeaCard tea={tea} />
                      </div>
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

      <Section title="✨ 맞춤차" description="다양한 기준으로 엄선한 차 목록이에요." spacing="lg">
        {curationTeas.length > 0 ? (
          <div className={CARD_CONTAINER_CLASSES}>
            {curationTeas.slice(0, 3).map((tea) => (
              <div key={tea.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE)}>
                <TeaCard tea={tea} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">엄선한 차가 없습니다.</p>
        )}
      </Section>

      <Section title="🏪 찻집/다실" description="차를 구매할 수 있는 찻집과 다실을 둘러보세요." spacing="lg">
        {sellers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {sellers.map((seller) => (
              <button
                key={seller.name}
                onClick={() => navigate(`/teahouse/${encodeURIComponent(seller.name)}`)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left"
              >
                <Store className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{seller.name}</span>
                <span className="text-xs text-muted-foreground">{seller.teaCount}종</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">등록된 찻집이 없습니다.</p>
        )}
      </Section>

      <div className="flex flex-col gap-2">
        <Button variant="outline" className="w-full" onClick={() => navigate('/teahouse/new')}>
          <Store className="w-4 h-4 mr-2" />
          찻집 신규추가
        </Button>
        <Button variant="outline" className="w-full" onClick={() => navigate('/tea/new')}>
          <Plus className="w-4 h-4 mr-2" />
          새 차 등록
        </Button>
      </div>
    </div>
  );
}
