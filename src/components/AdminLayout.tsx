import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Flag, Users, FileText, MessageSquare, ClipboardList, Database, Activity } from 'lucide-react';

const navItems = [
  { path: '/admin', label: '대시보드', icon: LayoutDashboard },
  { path: '/admin/reports', label: '신고 관리', icon: Flag },
  { path: '/admin/users', label: '사용자', icon: Users },
  { path: '/admin/notes', label: '차록', icon: FileText },
  { path: '/admin/posts', label: '게시글', icon: MessageSquare },
  { path: '/admin/monitoring', label: '모니터링', icon: Activity },
  { path: '/admin/master', label: '마스터 데이터', icon: Database },
  { path: '/admin/audit', label: '감사 로그', icon: ClipboardList },
];

export function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="text-lg font-semibold text-sidebar-foreground hover:text-sidebar-primary">
            ChaLog 운영자
          </Link>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive =
              location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-1 transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-sidebar-border">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            앱으로 돌아가기
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto max-w-6xl p-6 text-foreground">
        <Outlet />
      </main>
    </div>
  );
}
