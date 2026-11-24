/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from './lib/api';
import type { PublicSiteSettings } from './types/api';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';
import { HomePage } from './pages/HomePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { ContactPage } from './pages/ContactPage';
import { AdminLayout } from './pages/admin/AdminLayout';

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() =>
    normalizePath(window.location.pathname),
  );
  const [settings, setSettings] = useState<PublicSiteSettings | null>(null);

  const loadSettings = useCallback(() => {
    api
      .getPublicSiteSettings()
      .then((res) => {
        setSettings(res);
        if (res.siteName) {
          document.title = `${res.siteName} — حلول العزل الهندسي المائي والحراري`;
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextPath: string) => {
    const normalized = normalizePath(nextPath);
    if (normalized !== normalizePath(window.location.pathname)) {
      window.history.pushState({}, '', normalized);
    }
    setCurrentPath(normalized);
    window.scrollTo({ top: 0 });
  }, []);

  // Admin Workspace Route (/admin)
  if (currentPath === '/admin' || currentPath.startsWith('/admin/')) {
    return <AdminLayout navigate={navigate} onSiteSettingsChanged={loadSettings} />;
  }

  // Match Public Routes
  let pageContent: React.ReactNode;
  if (currentPath === '/' || currentPath === '') {
    pageContent = <HomePage settings={settings} navigate={navigate} />;
  } else if (currentPath === '/projects') {
    pageContent = <ProjectsPage navigate={navigate} />;
  } else if (currentPath.startsWith('/projects/')) {
    const segment = decodeURIComponent(currentPath.slice('/projects/'.length));
    pageContent = <ProjectDetailPage segment={segment} navigate={navigate} />;
  } else if (currentPath.startsWith('/services/')) {
    const segment = decodeURIComponent(currentPath.slice('/services/'.length));
    pageContent = <ServiceDetailPage segment={segment} navigate={navigate} />;
  } else if (currentPath === '/contact') {
    pageContent = <ContactPage settings={settings} />;
  } else {
    pageContent = (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center space-y-5">
        <p className="font-mono text-sm font-semibold text-[#B45309]">404</p>
        <h1 className="text-2xl font-bold text-slate-900">الصفحة المطلوبة غير موجودة</h1>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0E1116] hover:bg-slate-800 rounded-md cursor-pointer"
        >
          العودة للصفحة الرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F5F6] text-[#0F172A]">
      <PublicHeader
        siteName={settings?.siteName || 'MANEE | مَنيع'}
        currentPath={currentPath}
        navigate={navigate}
      />
      <main className="flex-1">{pageContent}</main>
      <PublicFooter settings={settings} navigate={navigate} />
    </div>
  );
}
