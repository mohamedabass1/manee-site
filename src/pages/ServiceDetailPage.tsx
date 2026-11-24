import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { api, extractIdFromSegment } from '../lib/api';
import {
  PROJECT_STATUS_AR,
  type PublicProjectListItem,
  type PublicService,
} from '../types/api';
import { ImageWithFallback } from '../components/ImageWithFallback';

interface ServiceDetailPageProps {
  segment: string;
  navigate: (path: string) => void;
}

export function ServiceDetailPage({ segment, navigate }: ServiceDetailPageProps) {
  const [service, setService] = useState<PublicService | null>(null);
  const [projects, setProjects] = useState<PublicProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = extractIdFromSegment(segment);
    if (!id) {
      setError('رابط الخدمة غير صالح.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getPublicServiceById(id),
      api.getPublicProjects({ serviceId: id, page: 1, pageSize: 12 }),
    ])
      .then(([svc, projRes]) => {
        if (!active) return;
        setService(svc);
        setProjects(projRes.items);
      })
      .catch((err) => {
        if (active) setError(err.message || 'الخدمة غير موجودة.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [segment]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-6">
        <div className="h-10 w-72 bg-slate-200 rounded animate-pulse" />
        <div className="h-44 w-full bg-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center space-y-5">
        <h1 className="text-2xl font-bold text-slate-900">{error || 'الخدمة غير موجودة'}</h1>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0E1116] rounded-md cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للرئيسية</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#F4F5F6] min-h-[80vh]">
      <section className="border-b border-white/10 bg-[#0E1116] text-white">
        <div className="max-w-7xl mx-auto space-y-4 px-5 py-12 sm:px-6 sm:py-16">
          <nav className="flex items-center gap-2 text-xs text-slate-400">
            <button type="button" onClick={() => navigate('/')} className="hover:text-white cursor-pointer">
              الرئيسية
            </button>
            <span aria-hidden="true">/</span>
            <span className="text-slate-200">{service.name}</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{service.name}</h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
            {service.shortDescription}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto space-y-8 px-5 py-8 sm:px-6 sm:py-12 lg:space-y-10">
        {service.description && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-slate-900">المواصفات الفنية ونطاق التنفيذ</h2>
            <p className="text-sm sm:text-base text-slate-700 leading-[1.85] whitespace-pre-line">
              {service.description}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#D97706] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B45309] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
              >
                اطلب معاينة لخدمة {service.name}
              </button>
            </div>
          </div>
        )}

        <section className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              مشاريع منفّذة ضمن خدمة {service.name}
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {projects.length} مشروع
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-sm text-slate-500">
              لا توجد مشاريع منشورة مرتبطة بهذه الخدمة حالياً.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {projects.map((p) => (
                <a
                  key={p.id}
                  href={`/projects/${p.urlSegment}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-right shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
                >
                  <div className="aspect-[4/3] bg-slate-900 overflow-hidden">
                    <ImageWithFallback
                      src={p.coverImage?.thumbnailUrl || p.coverImage?.url}
                      alt={p.coverImage?.altText || p.title}
                      fallbackTitle={p.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between space-y-3 p-5">
                    <div className="space-y-2">
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span className="font-semibold text-[#B45309]">{p.category.name}</span>
                        {p.city && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{p.city}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{PROJECT_STATUS_AR[p.status]}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#B45309]">
                        {p.title}
                      </h3>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>عرض المشروع</span>
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
