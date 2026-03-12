import { TeaCard } from './TeaCard';
import { CreatorCard } from './CreatorCard';
import { EmptyState } from './EmptyState';
import { Section } from './ui/Section';
import { Tea } from '../types';
import { cn } from './ui/utils';
import { CARD_WIDTH, CARD_CONTAINER_CLASSES, CARD_ITEM_WRAPPER_CLASSES } from '../constants';

interface TrendingUser {
  id: number;
  name: string;
  profileImageUrl?: string | null;
  followerCount: number;
}

interface HomeTrendingSectionProps {
  trendingTeas: Tea[];
  trendingCreators: TrendingUser[];
}

export function HomeTrendingSection({ trendingTeas, trendingCreators }: HomeTrendingSectionProps) {
  return (
    <>
      <Section title="🍵 요즘 인기 차" description="최근 7일간 차록이 많은 인기 차예요." spacing="lg">
        {trendingTeas.length > 0 ? (
          <div className={CARD_CONTAINER_CLASSES}>
            {trendingTeas.map((tea) => (
              <div key={tea.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE)}>
                <TeaCard tea={tea} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState type="feed" message="아직 트렌딩 차가 없습니다." />
        )}
      </Section>

      <Section title="🌿 인기 다우" description="구독자가 많은 인기 다우를 만나보세요." spacing="lg">
        {trendingCreators.length > 0 ? (
          <div className={CARD_CONTAINER_CLASSES}>
            {trendingCreators.map((creator) => (
              <div key={creator.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.DEFAULT)}>
                <CreatorCard user={creator} followerCount={creator.followerCount} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState type="feed" message="아직 인기 다우가 없습니다." />
        )}
      </Section>
    </>
  );
}
