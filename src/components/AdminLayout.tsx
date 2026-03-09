import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Flag, Users, FileText, MessageSquare, ClipboardList, Database, Activity, Menu } from 'lucide-react';
import { Sheet, SheetContent } from './ui/sheet';
import { Button } from './ui/button';

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

function NavLinks({
  location,
  onLinkClick,
}: {
  location: ReturnType<typeof useLocation>;
  onLinkClick?: () => void;
}) {
  return (
    <>
      {navItems.map(({ path, label, icon: Icon }) => {
        const isActive =
          location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path));
        return (
          <Link
            key={path}
            to={path}
            onClick={onLinkClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-1 transition-colors ${
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function AdminLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-sidebar-border">
        <Link
          to="/"
          className="text-lg font-semibold text-sidebar-foreground hover:text-sidebar-primary"
          onClick={closeMobileMenu}
        >
          ChaLog 운영자
        </Link>
      </div>
      <nav className="flex-1 p-2 overflow-y-auto">
        <NavLinks location={location} onLinkClick={closeMobileMenu} />
      </nav>
      <div className="p-2 border-t border-sidebar-border">
        <Link
          to="/"
          onClick={closeMobileMenu}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          앱으로 돌아가기
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* 데스크톱 사이드바 */}
      <aside className="hidden md:flex w-56 shrink-0 bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border">
        {sidebarContent}
      </aside>

      {/* 모바일 헤더 - md 이상에서는 숨김 */}
      <header className="md:hidden sticky top-0 z-40 flex items-center gap-2 px-4 py-3 bg-background border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="icon"
          aria-label="메뉴 열기"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </Button>
        <Link to="/admin" className="text-lg font-semibold text-foreground truncate flex-1 min-w-0">
          ChaLog 운영자
        </Link>
      </header>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border flex flex-col [&>button]:top-3 [&>button]:right-3 [&>button]:text-sidebar-foreground">
          <div className="flex flex-col h-full pt-4 pr-12">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-auto min-w-0 max-w-6xl p-4 md:p-6 text-foreground">
        <Outlet />
      </main>
    </div>
  );
}
