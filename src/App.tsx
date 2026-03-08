import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

function CommunityRedirect() {
  const { pathname } = useLocation();
  return <Navigate to={pathname.replace('/community', '/chadam')} replace />;
}
import { ThemeProvider } from 'next-themes';
import { PAGE_BG_GRADIENT } from './constants';
import { Plus } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { TeaDetail } from './pages/TeaDetail';
import { NewTea } from './pages/NewTea';
import { NewNote } from './pages/NewNote';
import { EditNote } from './pages/EditNote';
import { NoteDetail } from './pages/NoteDetail';
import { MyNotes } from './pages/MyNotes';
import { Saved } from './pages/Saved';
import { UserProfile } from './pages/UserProfile';
import { Settings } from './pages/Settings';
import { Cellar } from './pages/Cellar';
import { NewCellarItem } from './pages/NewCellarItem';
import { Community } from './pages/Community';
import { PostDetail } from './pages/PostDetail';
import { NewPost } from './pages/NewPost';
import { EditPost } from './pages/EditPost';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { TagDetail } from './pages/TagDetail';
import { ShopDetail } from './pages/ShopDetail';
import { NewShop } from './pages/NewShop';
import { Notifications } from './pages/Notifications';
import { FloatingActionButton } from './components/FloatingActionButton';
import { AdminRouteGuard } from './components/AdminRouteGuard';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminNotes } from './pages/admin/AdminNotes';
import { AdminPosts } from './pages/admin/AdminPosts';
import { AdminAudit } from './pages/admin/AdminAudit';
import { AdminMaster } from './pages/admin/AdminMaster';
import { PullToRefreshProvider } from './contexts/PullToRefreshContext';

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
  '/onboarding': { hidden: true },
};

function FloatingActionButtonSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 동적 라우트 처리 (차담 페이지는 자체 FAB을 사용)
  const shouldHide = 
    location.pathname === '/note/new' ||
    location.pathname.startsWith('/note/') && location.pathname.endsWith('/edit') ||
    location.pathname === '/tea/new' ||
    location.pathname === '/teahouse/new' ||
    location.pathname === '/cellar' ||
    location.pathname === '/cellar/new' ||
    location.pathname === '/chadam' ||
    location.pathname.startsWith('/chadam/') ||
    location.pathname === '/onboarding' ||
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
  const publicPaths = ['/login', '/register', '/onboarding'];

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
            <Route path="audit" element={<AdminAudit />} />
          </Route>
        </Routes>
      </AdminRouteGuard>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto h-screen flex flex-col overflow-hidden ${PAGE_BG_GRADIENT}`}>
      <OnboardingRouteGuard>
        <PullToRefreshProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/preview_page.html" element={<Navigate to="/" replace />} />
            <Route path="/sasaek" element={<Search />} />
            <Route path="/tea/new" element={<NewTea />} />
            <Route path="/tea/:id" element={<TeaDetail />} />
            <Route path="/note/new" element={<NewNote />} />
            <Route path="/note/:id/edit" element={<EditNote />} />
            <Route path="/note/:id" element={<NoteDetail />} />
            <Route path="/user/:id" element={<UserProfile />} />
            <Route path="/my-notes" element={<MyNotes />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/cellar" element={<Cellar />} />
            <Route path="/cellar/new" element={<NewCellarItem />} />
            <Route path="/chadam" element={<Community />} />
            <Route path="/chadam/new" element={<NewPost />} />
            <Route path="/chadam/:id" element={<PostDetail />} />
            <Route path="/chadam/:id/edit" element={<EditPost />} />
            <Route path="/tag/:name" element={<TagDetail />} />
            <Route path="/teahouse/new" element={<NewShop />} />
            <Route path="/teahouse/:name" element={<ShopDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
            <Route path="/search" element={<Navigate to="/sasaek" replace />} />
            <Route path="/community/*" element={<CommunityRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PullToRefreshProvider>
      </OnboardingRouteGuard>
      <FloatingActionButtonSwitcher />
    </div>
  );
}

export default function App() {
  const content = (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="chalog-theme">
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );

  if (googleClientId) {
    return <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>;
  }

  return content;
}