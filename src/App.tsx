import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { PAGE_BG_GRADIENT } from './constants';
import { Plus, Loader2 } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FloatingActionButton } from './components/FloatingActionButton';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { AdminRouteGuard } from './components/AdminRouteGuard';
import { AdminLayout } from './components/AdminLayout';
import { AppSidebar } from './components/AppSidebar';
import { DesktopHeader } from './components/DesktopHeader';
import { SidebarProvider } from './contexts/SidebarContext';
import { PullToRefreshProvider } from './contexts/PullToRefreshContext';

function CommunityRedirect() {
  const { pathname } = useLocation();
  return <Navigate to={pathname.replace('/community', '/chadam')} replace />;
}

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
  </div>
);

// 자주 방문하는 페이지: 즉시 로드
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Login } from './pages/Login';

// 나머지 페이지: lazy 로드
const TeaDetail = lazy(() => import('./pages/TeaDetail').then((m) => ({ default: m.TeaDetail })));
const NewTea = lazy(() => import('./pages/NewTea').then((m) => ({ default: m.NewTea })));
const EditTea = lazy(() => import('./pages/EditTea').then((m) => ({ default: m.EditTea })));
const NewNote = lazy(() => import('./pages/NewNote').then((m) => ({ default: m.NewNote })));
const EditNote = lazy(() => import('./pages/EditNote').then((m) => ({ default: m.EditNote })));
const NoteDetail = lazy(() => import('./pages/NoteDetail').then((m) => ({ default: m.NoteDetail })));
const MyNotes = lazy(() => import('./pages/MyNotes').then((m) => ({ default: m.MyNotes })));
const Saved = lazy(() => import('./pages/Saved').then((m) => ({ default: m.Saved })));
const UserProfile = lazy(() => import('./pages/UserProfile').then((m) => ({ default: m.UserProfile })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Cellar = lazy(() => import('./pages/Cellar').then((m) => ({ default: m.Cellar })));
const NewCellarItem = lazy(() => import('./pages/NewCellarItem').then((m) => ({ default: m.NewCellarItem })));
const EditCellarItem = lazy(() => import('./pages/EditCellarItem').then((m) => ({ default: m.EditCellarItem })));
const Community = lazy(() => import('./pages/Community').then((m) => ({ default: m.Community })));
const PostDetail = lazy(() => import('./pages/PostDetail').then((m) => ({ default: m.PostDetail })));
const NewPost = lazy(() => import('./pages/NewPost').then((m) => ({ default: m.NewPost })));
const EditPost = lazy(() => import('./pages/EditPost').then((m) => ({ default: m.EditPost })));
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const FindEmail = lazy(() => import('./pages/FindEmail').then((m) => ({ default: m.FindEmail })));
const Onboarding = lazy(() => import('./pages/Onboarding').then((m) => ({ default: m.Onboarding })));
const TagDetail = lazy(() => import('./pages/TagDetail').then((m) => ({ default: m.TagDetail })));
const ShopDetail = lazy(() => import('./pages/ShopDetail').then((m) => ({ default: m.ShopDetail })));
const NewShop = lazy(() => import('./pages/NewShop').then((m) => ({ default: m.NewShop })));
const EditShop = lazy(() => import('./pages/EditShop').then((m) => ({ default: m.EditShop })));
const Notifications = lazy(() => import('./pages/Notifications').then((m) => ({ default: m.Notifications })));
const SessionNew = lazy(() => import('./pages/SessionNew').then((m) => ({ default: m.SessionNew })));
const SessionInProgress = lazy(() => import('./pages/SessionInProgress').then((m) => ({ default: m.SessionInProgress })));
const SessionSummary = lazy(() => import('./pages/SessionSummary').then((m) => ({ default: m.SessionSummary })));
const SessionHistory = lazy(() => import('./pages/SessionHistory').then((m) => ({ default: m.SessionHistory })));
const BlindSessionNew = lazy(() => import('./pages/BlindSessionNew').then((m) => ({ default: m.BlindSessionNew })));
const BlindSessionJoin = lazy(() => import('./pages/BlindSessionJoin').then((m) => ({ default: m.BlindSessionJoin })));
const BlindSessionDetail = lazy(() => import('./pages/BlindSessionDetail').then((m) => ({ default: m.BlindSessionDetail })));
const BlindNoteWrite = lazy(() => import('./pages/BlindNoteWrite').then((m) => ({ default: m.BlindNoteWrite })));
const BlindSessionReport = lazy(() => import('./pages/BlindSessionReport').then((m) => ({ default: m.BlindSessionReport })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminReports = lazy(() => import('./pages/admin/AdminReports').then((m) => ({ default: m.AdminReports })));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })));
const AdminNotes = lazy(() => import('./pages/admin/AdminNotes').then((m) => ({ default: m.AdminNotes })));
const AdminPosts = lazy(() => import('./pages/admin/AdminPosts').then((m) => ({ default: m.AdminPosts })));
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit').then((m) => ({ default: m.AdminAudit })));
const AdminMonitoring = lazy(() => import('./pages/admin/AdminMonitoring').then((m) => ({ default: m.AdminMonitoring })));
const AdminMaster = lazy(() => import('./pages/admin/AdminMaster').then((m) => ({ default: m.AdminMaster })));


type FloatingActionRouteConfig = {
  position?: 'default' | 'aboveNav';
  ariaLabel?: string;
  hidden?: boolean;
};

const DEFAULT_FLOATING_ACTION_CONFIG: FloatingActionRouteConfig = {
  position: 'aboveNav',
  ariaLabel: '새 차록 작성',
};

const floatingActionRouteOverrides: Record<string, FloatingActionRouteConfig> = {
  '/my-notes': { position: 'aboveNav' },
  '/notifications': { hidden: true },
  '/note/new': { hidden: true },
  '/note/:id/edit': { hidden: true },
  '/tea/new': { hidden: true },
  '/teahouse/new': { hidden: true },
  '/cellar': { hidden: true },
  '/cellar/new': { hidden: true },
  '/session/new': { hidden: true },
  '/sessions': { hidden: true },
  '/blind/new': { hidden: true },
  '/blind/join/:code': { hidden: true },
  '/blind/:id': { hidden: true },
  '/blind/:id/write': { hidden: true },
  '/blind/:id/report': { hidden: true },
  '/onboarding': { hidden: true },
};

function FloatingActionButtonSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 동적 라우트 처리 (차담 페이지는 자체 FAB을 사용)
  const shouldHide = 
    location.pathname === '/note/new' ||
    location.pathname.startsWith('/note/') && location.pathname.endsWith('/edit') ||
    location.pathname.startsWith('/session/') ||
    location.pathname === '/sessions' ||
    location.pathname.startsWith('/blind/') ||
    location.pathname === '/tea/new' ||
    location.pathname === '/teahouse/new' ||
    location.pathname.match(/^\/teahouse\/[^/]+\/edit$/) ||
    location.pathname === '/cellar' ||
    location.pathname === '/cellar/new' ||
    location.pathname.match(/^\/cellar\/\d+\/edit$/) ||
    location.pathname === '/chadam' ||
    location.pathname.startsWith('/chadam/') ||
    location.pathname === '/onboarding' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password' ||
    location.pathname === '/find-email' ||
    location.pathname.startsWith('/admin');
  
  const override = floatingActionRouteOverrides[location.pathname];
  const config = {
    ...DEFAULT_FLOATING_ACTION_CONFIG,
    ...override,
  };

  if (config.hidden || shouldHide) {
    return null;
  }

  return (
    <FloatingActionButton
      onClick={() => navigate('/note/new')}
      ariaLabel={config.ariaLabel}
      position={config.position}
    >
      <Plus className="w-6 h-6" />
    </FloatingActionButton>
  );
}

function OnboardingRouteGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, isLoading, hasCompletedOnboarding, isOnboardingLoading } = useAuth();
  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/onboarding', '/find-email'];

  if (isLoading || isOnboardingLoading) {
    return null;
  }

  if (user && hasCompletedOnboarding === false && !publicPaths.includes(location.pathname)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (user && hasCompletedOnboarding === true && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <AdminRouteGuard>
        <Suspense fallback={<PageFallback />}>
          <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="users/:id" element={<AdminUsers />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="notes" element={<AdminNotes />} />
            <Route path="posts" element={<AdminPosts />} />
            <Route path="posts/:id" element={<AdminPosts />} />
            <Route path="master" element={<AdminMaster />} />
            <Route path="monitoring" element={<AdminMonitoring />} />
            <Route path="audit" element={<AdminAudit />} />
          </Route>
        </Routes>
        </Suspense>
      </AdminRouteGuard>
    );
  }

  return (
    <SidebarProvider>
    <div className={`h-screen flex flex-col md:flex-row overflow-hidden ${PAGE_BG_GRADIENT}`}>
      {/* 데스크톱 사이드바 (md 이상에서만 표시) */}
      <AppSidebar />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* 데스크톱 헤더 (md 이상에서만 표시) */}
        <DesktopHeader />

        <OnboardingRouteGuard>
          <PullToRefreshProvider>
            <Suspense fallback={<PageFallback />}>
            <main className="flex-1 overflow-y-auto max-w-2xl md:max-w-5xl lg:max-w-6xl mx-auto w-full">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/preview_page.html" element={<Navigate to="/" replace />} />
                <Route path="/sasaek" element={<Search />} />
                <Route path="/tea/new" element={<NewTea />} />
                <Route path="/tea/:id/edit" element={<EditTea />} />
                <Route path="/tea/:id" element={<TeaDetail />} />
                <Route path="/note/new" element={<NewNote />} />
                <Route path="/note/:id/edit" element={<EditNote />} />
                <Route path="/session/new" element={<SessionNew />} />
                <Route path="/session/:id" element={<SessionInProgress />} />
                <Route path="/session/:id/summary" element={<SessionSummary />} />
                <Route path="/sessions" element={<SessionHistory />} />
                <Route path="/blind/new" element={<BlindSessionNew />} />
                <Route path="/blind/join/:code" element={<BlindSessionJoin />} />
                <Route path="/blind/:id" element={<BlindSessionDetail />} />
                <Route path="/blind/:id/write" element={<BlindNoteWrite />} />
                <Route path="/blind/:id/report" element={<BlindSessionReport />} />
                <Route path="/note/:id" element={<NoteDetail />} />
                <Route path="/user/:id" element={<UserProfile />} />
                <Route path="/my-notes" element={<MyNotes />} />
                <Route path="/saved" element={<Saved />} />
                <Route path="/cellar" element={<Cellar />} />
                <Route path="/cellar/new" element={<NewCellarItem />} />
                <Route path="/cellar/:id/edit" element={<EditCellarItem />} />
                <Route path="/chadam" element={<Community />} />
                <Route path="/chadam/new" element={<NewPost />} />
                <Route path="/chadam/:id" element={<PostDetail />} />
                <Route path="/chadam/:id/edit" element={<EditPost />} />
                <Route path="/tag/:name" element={<TagDetail />} />
                <Route path="/teahouse/new" element={<NewShop />} />
                <Route path="/teahouse/:name/edit" element={<EditShop />} />
                <Route path="/teahouse/:name" element={<ShopDetail />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/find-email" element={<FindEmail />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
                <Route path="/search" element={<Navigate to="/sasaek" replace />} />
                <Route path="/community/*" element={<CommunityRedirect />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            </Suspense>
          </PullToRefreshProvider>
        </OnboardingRouteGuard>
      </div>

      <FloatingActionButtonSwitcher />
      <PWAInstallBanner />
    </div>
    </SidebarProvider>
  );
}

export default function App() {
  const content = (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="chalog-theme">
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
          <Toaster offset={{ bottom: 'calc(var(--bottom-nav-spacer) + 0.5rem)' }} />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );

  if (googleClientId) {
    return <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>;
  }

  return content;
}