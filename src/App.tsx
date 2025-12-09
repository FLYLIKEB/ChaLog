import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { TeaDetail } from './pages/TeaDetail';
import { NewTea } from './pages/NewTea';
import { NewNote } from './pages/NewNote';
import { EditNote } from './pages/EditNote';
import { NoteDetail } from './pages/NoteDetail';
import { MyNotes } from './pages/MyNotes';
import { UserProfile } from './pages/UserProfile';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
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
};

function FloatingActionButtonSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const override = floatingActionRouteOverrides[location.pathname];
  const config = {
    ...DEFAULT_FLOATING_ACTION_CONFIG,
    ...override,
  };

  if (config.hidden) {
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="max-w-2xl mx-auto bg-white min-h-screen">
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
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <FloatingActionButtonSwitcher />
          <Toaster />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}