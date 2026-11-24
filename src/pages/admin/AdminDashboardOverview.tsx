import { useEffect, useState } from 'react';
import { ArrowLeft, FolderPlus, Mail, Settings } from 'lucide-react';
import { api } from '../../lib/api';
import {
  MESSAGE_STATUS_AR,
  PROJECT_STATUS_AR,
  type AdminProjectListItem,
  type ContactMessageItem,
} from '../../types/api';

interface AdminDashboardOverviewProps {
  onSelectSection: (section: 'projects' | 'lookups' | 'messages' | 'settings', openNewProject?: boolean) => void;
}

export function AdminDashboardOverview({ onSelectSection }: AdminDashboardOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    publishedProjects: 0,
    unreadMessages: 0,
    activeServices: 0,
  });
  const [recentProjects, setRecentProjects] = useState<AdminProjectListItem[]>([]);
  const [recentMessages, setRecentMessages] = useState<ContactMessageItem[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getAdminProjects({ page: 1, pageSize: 5 }),
      api.getAdminProjects({ page: 1, pageSize: 1, isPublished: true }),
      api.getUnreadMessageCount(),
      api.getAdminMessages({ page: 1, pageSize: 5 }),
      api.getAdminServices(),
    ])
      .then(([allProj, pubProj, unread, msgs, svcs]) => {
        if (!active) return;
        setStats({
          totalProjects: allProj.totalCount,
          publishedProjects: pubProj.totalCount,
          unreadMessages: unread.count,
          activeServices: svcs.filter((s) => s.isActive).length,
        });
        setRecentProjects(allProj.items);
        setRecentMessages(msgs.items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-4 lg:divide-y-0 lg:divide-x lg:divide-x-reverse">
        <div className="space-y-1 p-4 sm:p-5">
          <div className="text-xs text-slate-500">إجمالي المشاريع النشطة</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 sm:text-3xl">
            {stats.totalProjects}
          </div>
        </div>
        <div className="space-y-1 p-4 sm:p-5">
          <div className="text-xs text-slate-500">المشاريع المنشورة للعامة</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 sm:text-3xl">
            {stats.publishedProjects}
          </div>
        </div>
        <div className="space-y-1 p-4 sm:p-5">
          <div className="text-xs text-slate-500">رسائل عملاء جديدة</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#B45309] sm:text-3xl">
            {stats.unreadMessages}
          </div>
        </div>
        <div className="space-y-1 p-4 sm:p-5">
          <div className="text-xs text-slate-500">الخدمات الفعّالة</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 sm:text-3xl">
            {stats.activeServices}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={() => onSelectSection('projects', true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B45309] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
        >
          <FolderPlus className="w-4 h-4" />
          <span>إضافة مشروع جديد</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectSection('messages')}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
        >
          <Mail className="w-4 h-4" />
          <span>صندوق رسائل العملاء</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectSection('settings')}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
        >
          <Settings className="w-4 h-4" />
          <span>إعدادات الموقع والإشعارات</span>
        </button>
      </div>

      {/* Two-Column Recent Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">أحدث المشاريع</h2>
            <button
              type="button"
              onClick={() => onSelectSection('projects')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#B45309] hover:underline cursor-pointer"
            >
              <span>إدارة الكل</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">لا توجد مشاريع مضافة بعد.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">المشروع</th>
                    <th className="py-2.5 px-4 font-semibold">الحالة</th>
                    <th className="py-2.5 px-4 font-semibold">النشر</th>
                    <th className="py-2.5 px-4 font-semibold">الصور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 line-clamp-1">{p.title}</div>
                        <div className="text-xs text-slate-500">
                          {p.category.name}
                          {p.city ? ` · ${p.city}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {PROJECT_STATUS_AR[p.status]}
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        <span
                          className={
                            p.isPublished
                              ? 'text-emerald-700 font-semibold'
                              : 'text-slate-500'
                          }
                        >
                          {p.isPublished ? 'منشور' : 'مسودة'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-700">
                        {p.imageCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">أحدث استفسارات العملاء</h2>
            <button
              type="button"
              onClick={() => onSelectSection('messages')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#B45309] hover:underline cursor-pointer"
            >
              <span>عرض الكل</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentMessages.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              لم تصل أي رسائل من العملاء بعد.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentMessages.map((m) => (
                <div key={m.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span className="truncate">{m.fullName}</span>
                      <span className="text-xs font-normal text-slate-500 font-mono tabular-nums" dir="ltr">
                        {m.phone}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1">{m.message}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                      m.status === 'New'
                        ? 'text-[#B45309]'
                        : m.status === 'Handled'
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                    }`}
                  >
                    {MESSAGE_STATUS_AR[m.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
