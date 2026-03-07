import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import { Notifications } from './pages/Notifications';
import { FloatingActionButton } from './components/FloatingActionButton';

type FloatingActionRouteConfig = {
  position?: 'default' | 'aboveNav';
  ariaLabel?: string;
  hidden?: boolean;
};

const DEFAULT_FLOATING_ACTION_CONFIG: FloatingActionRouteConfig = {
  position: 'aboveNav',
  ariaLabel: '새 노트 작성',
};

const floatingActionRouteOverrides: Record<string, FloatingActionRouteConfig> = {
  '/my-notes': { position: 'aboveNav' },
  '/notifications': { hidden: true },
  '/note/new': { hidden: true },
  '/note/:id/edit': { hidden: true },
  '/tea/new': { hidden: true },
  '/cellar': { hidden: true },
  '/cellar/new': { hidden: true },
  '/onboarding': { hidden: true },
};

function FloatingActionButtonSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 동적 라우트 처리 (커뮤니티 페이지는 자체 FAB을 사용)
  const shouldHide = 
    location.pathname === '/note/new' ||
    location.pathname.startsWith('/note/') && location.pathname.endsWith('/edit') ||
    location.pathname === '/tea/new' ||
    location.pathname === '/cellar' ||
    location.pathname === '/cellar/new' ||
    location.pathname === '/community' ||
    location.pathname.startsWith('/community/') ||
    location.pathname === '/onboarding';
  
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

export default function App() {
  const content = (
    <AuthProvider>
      <BrowserRouter>
        <div className="max-w-2xl mx-auto bg-background min-h-screen px-4 sm:px-6">
          <OnboardingRouteGuard>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/preview_page.html" element={<Navigate to="/" replace />} />
              <Route path="/search" element={<Search />} />
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
              <Route path="/community" element={<Community />} />
              <Route path="/community/new" element={<NewPost />} />
              <Route path="/community/:id" element={<PostDetail />} />
              <Route path="/community/:id/edit" element={<EditPost />} />
              <Route path="/tag/:name" element={<TagDetail />} />
              <Route path="/shop/:name" element={<ShopDetail />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </OnboardingRouteGuard>
          <FloatingActionButtonSwitcher />
          <Toaster />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );

  if (googleClientId) {
    return <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>;
  }

  return content;
}