import { useEffect, useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  FolderKanban,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import { api, getAuthToken, setAuthToken } from '../../lib/api';
import type { AuthMe } from '../../types/api';
import { AdminAuthScreen } from './AdminAuthScreen';
import { AdminDashboardOverview } from './AdminDashboardOverview';
import { AdminProjectsView } from './AdminProjectsView';
import { AdminLookupsView } from './AdminLookupsView';
import { AdminMessagesView } from './AdminMessagesView';
import { AdminSettingsView } from './AdminSettingsView';

type AdminSection = 'overview' | 'projects' | 'lookups' | 'messages' | 'settings';

interface AdminLayoutProps {
  navigate: (path: string) => void;
  onSiteSettingsChanged: () => void;
}

const SECTION_TITLES: Record<AdminSection, string> = {
  overview: 'نظرة عامة',
  projects: 'إدارة المشاريع والصور',
  lookups: 'التصنيفات والخدمات والمواد',
  messages: 'رسائل العملاء',
  settings: 'إعدادات الموقع والأمان',
};

export function AdminLayout({ navigate, onSiteSettingsChanged }: AdminLayoutProps) {
  const [user, setUser] = useState<AuthMe | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [section, setSection] = useState<AdminSection>('overview');
  const [openNewProjectFlag, setOpenNewProjectFlag] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, tone: 'success' | 'error' = 'success') => {
    setToast({ msg, tone });
    setTimeout(() => {
      setToast((curr) => (curr?.msg === msg ? null : curr));
    }, 4500);
  };

  const loadUnread = () => {
    api
      .getUnreadMessageCount()
      .then((res) => setUnreadCount(res.count))
      .catch(() => {});
  };

  const verifySession = () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setCheckingAuth(false);
      return;
    }
    setCheckingAuth(true);
    api
      .getMe()
      .then((me) => {
        setUser(me);
        loadUnread();
      })
      .catch(() => {
        setAuthToken(null);
        setUser(null);
      })
      .finally(() => setCheckingAuth(false));
  };

  useEffect(() => {
    verifySession();
  }, []);

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setSection('overview');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0E1116] flex items-center justify-center text-slate-300 text-sm">
        جاري التحقق من الجلسة...
      </div>
    );
  }

  if (!user) {
    return <AdminAuthScreen onAuthenticated={verifySession} navigate={navigate} />;
  }

  const navItems: Array<{ id: AdminSection; label: string; icon: typeof LayoutDashboard; badge?: number }> = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'projects', label: 'المشاريع والصور', icon: FolderKanban },
    { id: 'lookups', label: 'التصنيفات والخدمات والمواد', icon: Layers },
    { id: 'messages', label: 'رسائل العملاء', icon: Mail, badge: unreadCount },
    { id: 'settings', label: 'إعدادات الموقع', icon: Settings },
  ];

  const selectSection = (next: AdminSection, openNewProject = false) => {
    setOpenNewProjectFlag(openNewProject);
    setSection(next);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F6] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="إغلاق القائمة"
        />
      )}

      {/* Obsidian Sidebar Rail */}
      <aside
        id="admin-sidebar"
        className={`fixed right-0 top-0 z-50 flex h-dvh w-[min(84vw,300px)] shrink-0 flex-col justify-between overflow-y-auto border-l border-white/10 bg-[#0E1116] text-slate-200 transition-transform duration-200 lg:sticky lg:h-screen lg:w-[260px] ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          <div className="h-16 px-5 border-b border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => selectSection('overview')}
              className="text-base font-bold text-white tracking-tight cursor-pointer"
            >
              MANEE | مَنيع
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="إغلاق القائمة"
              className="lg:hidden text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectSection(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#D97706] text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`font-mono tabular-nums text-xs px-1.5 py-0.5 rounded ${
                        active ? 'bg-black/25 text-white' : 'bg-[#D97706]/20 text-[#F59E0B]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-2 text-xs">
          <div className="px-2 pb-2 text-slate-400">
            <div className="font-semibold text-slate-200 truncate">
              {user.fullName || user.username}
            </div>
            <div className="font-mono text-[11px] text-slate-500">@{user.username}</div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white rounded-md cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>معاينة الموقع العام</span>
          </button>

          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white rounded-md"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>توثيق الـ API (Swagger)</span>
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-md cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:gap-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              aria-expanded={sidebarOpen}
              aria-controls="admin-sidebar"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706] lg:hidden"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div className="truncate text-xs text-slate-500 sm:text-sm">
              <span>لوحة التحكم</span>
              <span className="mx-1.5 sm:mx-2">/</span>
              <span className="font-bold text-slate-900">{SECTION_TITLES[section]}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-slate-700 transition-colors hover:text-[#B45309] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706] sm:text-xs"
          >
            الانتقال للموقع العام
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
          {toast && (
            <div
              role="status"
              className={`mb-5 px-4 py-3 rounded-md border text-sm font-medium flex items-center justify-between ${
                toast.tone === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <span>{toast.msg}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          )}

          {section === 'overview' && (
            <AdminDashboardOverview
              onSelectSection={(target, openNew) => selectSection(target, openNew)}
            />
          )}
          {section === 'projects' && (
            <AdminProjectsView
              key={openNewProjectFlag ? 'new' : 'list'}
              initialOpenCreate={openNewProjectFlag}
              onNotify={showToast}
            />
          )}
          {section === 'lookups' && <AdminLookupsView onNotify={showToast} />}
          {section === 'messages' && (
            <AdminMessagesView onNotify={showToast} onUnreadChanged={loadUnread} />
          )}
          {section === 'settings' && (
            <AdminSettingsView
              onNotify={showToast}
              onSettingsUpdated={onSiteSettingsChanged}
            />
          )}
        </main>
      </div>
    </div>
  );
}
