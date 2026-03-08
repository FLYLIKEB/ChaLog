import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Flag, Users, FileText, MessageSquare, ClipboardList, Database } from 'lucide-react';

const navItems = [
  { path: '/admin', label: '대시보드', icon: LayoutDashboard },
  { path: '/admin/reports', label: '신고 관리', icon: Flag },
  { path: '/admin/users', label: '사용자', icon: Users },
  { path: '/admin/notes', label: '차록', icon: FileText },
  { path: '/admin/posts', label: '게시글', icon: MessageSquare },
  { path: '/admin/master', label: '마스터 데이터', icon: Database },
  { path: '/admin/audit', label: '감사 로그', icon: ClipboardList },
];

export function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-56 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <Link to="/" className="text-lg font-semibold">
            ChaLog 운영자
          </Link>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 px-3 py-2 rounded-md mb-1 transition-colors ${
                location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path))
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t border-slate-700">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            앱으로 돌아가기
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto max-w-6xl p-6 text-slate-900">
        <Outlet />
      </main>
    </div>
  );
}
