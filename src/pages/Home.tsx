import { useCallback } from 'react';
import { useScrollRestoration } from '../hooks/useScrollRestoration';
import { Header } from '../components/Header';
import { HeroSection } from '../components/HeroSection';
import { BottomNav } from '../components/BottomNav';
import { HomeBanner } from '../components/home/HomeBanner';
import { QuickAccess } from '../components/home/QuickAccess';
import { WeeklyCalendar } from '../components/home/WeeklyCalendar';
import { RecommendedContent } from '../components/home/RecommendedContent';
import { HomeFooter } from '../components/HomeFooter';
import { usePullToRefreshForPage } from '../contexts/PullToRefreshContext';
import { useAuth } from '../contexts/AuthContext';

export function Home() {
  useScrollRestoration();

  const { user: currentUser } = useAuth();

  const handleRefresh = useCallback(async () => {
    // 컴포넌트들이 자체 데이터를 관리하므로 no-op (각 컴포넌트가 mount 시 fetch)
  }, []);

  usePullToRefreshForPage(handleRefresh, '/');

  return (
    <div className="min-h-screen pb-20">
      <Header showProfile showLogo />
      <div className="px-4 py-5 pb-20 sm:px-6 space-y-5 md:space-y-6">
        <HeroSection />
        <HomeBanner />
        <QuickAccess />
        {currentUser && <WeeklyCalendar />}
        <RecommendedContent />
        <HomeFooter recentContributors={[]} />
      </div>
      <BottomNav />
    </div>
  );
}
