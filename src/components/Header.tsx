import { User, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showProfile?: boolean;
}

export function Header({ title, showBack, showProfile }: HeaderProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {title && <h1>{title}</h1>}
        {!title && !showBack && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg" />
            <span className="text-emerald-700">ChaLog</span>
          </div>
        )}
      </div>
      {showProfile && (
        <button
          onClick={() => navigate(isAuthenticated ? '/settings' : '/login')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <User className="w-5 h-5" />
        </button>
      )}
    </header>
  );
}
