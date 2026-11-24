import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { api, extractIdFromSegment } from '../lib/api';
import {
  IMAGE_STAGE_AR,
  PROJECT_STATUS_AR,
  type ImageStage,
  type PublicProjectDetails,
  type PublicProjectImage,
} from '../types/api';
import { ImageWithFallback } from '../components/ImageWithFallback';

interface ProjectDetailPageProps {
  segment: string;
  navigate: (path: string) => void;
}

const STAGE_ORDER: Array<'ALL' | ImageStage> = ['ALL', 'Before', 'During', 'After', 'General'];

export function ProjectDetailPage({ segment, navigate }: ProjectDetailPageProps) {
  const [project, setProject] = useState<PublicProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<'ALL' | ImageStage>('ALL');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const id = extractIdFromSegment(segment);
    if (!id) {
      setError('رابط المشروع غير صالح.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    api
      .getPublicProjectById(id)
      .then((res) => {
        if (active) {
          setProject(res);
          setSelectedStage('ALL');
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'المشروع غير موجود.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [segment]);

  const filteredImages: PublicProjectImage[] = project
    ? selectedStage === 'ALL'
      ? project.images
      : project.images.filter((img) => img.stage === selectedStage)
    : [];

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((idx) =>
          idx === null ? null : (idx + 1) % Math.max(1, filteredImages.length),
        );
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((idx) =>
          idx === null
            ? null
            : (idx - 1 + filteredImages.length) % Math.max(1, filteredImages.length),
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, filteredImages.length]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 px-5 py-12 sm:px-6 sm:py-16">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-96 w-full bg-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center space-y-5">
        <h1 className="text-2xl font-bold text-slate-900">{error || 'المشروع غير موجود'}</h1>
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0E1116] hover:bg-slate-800 rounded-md cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لمعرض المشاريع</span>
        </button>
      </div>
    );
  }

  const stageCounts = project.images.reduce<Record<string, number>>((acc, img) => {
    acc[img.stage] = (acc[img.stage] || 0) + 1;
    return acc;
  }, {});

  const specs = [
    { label: 'نوع المنشأة', value: project.category.name },
    { label: 'الحالة', value: PROJECT_STATUS_AR[project.status] },
    ...(project.city ? [{ label: 'المدينة', value: project.city }] : []),
    ...(project.areaInSquareMeters
      ? [
          {
            label: 'المساحة المعزولة',
            value: `${project.areaInSquareMeters.toLocaleString('en-US')} م²`,
            mono: true,
          },
        ]
      : []),
    ...(project.durationInDays
      ? [{ label: 'مدة التنفيذ', value: `${project.durationInDays} يوم`, mono: true }]
      : []),
    ...(project.executionDate
      ? [{ label: 'تاريخ التنفيذ', value: project.executionDate, mono: true }]
      : []),
  ];

  const activeLightboxImage =
    lightboxIndex !== null && filteredImages[lightboxIndex]
      ? filteredImages[lightboxIndex]
      : null;

  return (
    <div className="bg-[#F4F5F6] min-h-screen">
      {/* Dark Architectural Header */}
      <section className="border-b border-white/10 bg-[#0E1116] text-white">
        <div className="max-w-7xl mx-auto space-y-5 px-5 py-8 sm:px-6 sm:py-12">
          <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="hover:text-white cursor-pointer"
            >
              الرئيسية
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="hover:text-white cursor-pointer"
            >
              معرض الأعمال
            </button>
            <span aria-hidden="true">/</span>
            <span className="text-slate-200">{project.title}</span>
          </nav>

          <div className="space-y-3 max-w-4xl">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="font-semibold text-[#F59E0B]">{project.category.name}</span>
              {project.city && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{project.city}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{PROJECT_STATUS_AR[project.status]}</span>
            </div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {project.title}
            </h1>
            <p className="text-base text-slate-300 leading-relaxed">{project.shortDescription}</p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto space-y-8 px-5 py-8 sm:px-6 sm:py-10 lg:space-y-10">
        {/* Technical Specifications Strip */}
        <div className="grid grid-cols-2 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3 sm:divide-y-0 sm:divide-x sm:divide-x-reverse lg:grid-cols-6">
          {specs.map((spec) => (
            <div key={spec.label} className="p-4 space-y-1">
              <div className="text-xs text-slate-500">{spec.label}</div>
              <div
                className={`text-sm font-bold text-slate-900 ${
                  spec.mono ? 'font-mono tabular-nums' : ''
                }`}
              >
                {spec.value}
              </div>
            </div>
          ))}
        </div>

        {/* Cover Hero & Narrative Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            {project.coverImage && (
              <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200 bg-[#0E1116] shadow-lg shadow-slate-900/10">
                <ImageWithFallback
                  src={project.coverImage.url}
                  alt={project.coverImage.altText || project.title}
                  fallbackTitle={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold text-slate-900">التفاصيل الفنية ومنهجية التنفيذ</h2>
              <p className="text-sm sm:text-base text-slate-700 leading-[1.85] whitespace-pre-line">
                {project.description}
              </p>
            </div>
          </div>

          <aside className="lg:col-span-5 space-y-6">
            {/* Services Applied */}
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-base font-bold text-slate-900">الخدمات المنفّذة في المشروع</h3>
              {project.services.length === 0 ? (
                <p className="text-sm text-slate-500">لا توجد خدمات مرتبطة.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {project.services.map((svc) => (
                    <li key={svc.id} className="py-2.5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => navigate(`/services/${svc.urlSegment}`)}
                        className="text-sm font-semibold text-slate-800 hover:text-[#B45309] transition-colors cursor-pointer"
                      >
                        {svc.name}
                      </button>
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Materials Used */}
            {project.materials.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="text-base font-bold text-slate-900">مواد العزل المستخدمة</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  {project.materials.map((mat, i) => (
                    <li
                      key={mat.id}
                      className="flex items-baseline gap-2.5 py-1 border-b border-slate-100 last:border-0"
                    >
                      <span className="font-mono tabular-nums text-xs text-[#B45309]">
                        {String(i + 1).padStart(2, '0')}.
                      </span>
                      <span>{mat.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Consultation CTA */}
            <div className="space-y-4 rounded-2xl bg-[#0E1116] p-5 text-white shadow-lg shadow-slate-900/10 sm:p-6">
              <h3 className="text-base font-bold">هل لديك مشروع مشابه؟</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                تواصل مع الفريق الهندسي لتحديد نظام العزل الأنسب والحصول على معاينة ميدانية وعرض سعر تفصيلي.
              </p>
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="min-h-11 w-full rounded-lg bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B45309] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                اطلب استشارة لمشروع مماثل
              </button>
            </div>
          </aside>
        </div>

        {/* Stages Photo Gallery (Before / During / After / General) */}
        {project.images.length > 0 && (
          <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">توثيق مراحل التنفيذ بالصور</h2>
                <p className="text-xs text-slate-500 mt-1">
                  اضغط على أي صورة لعرضها بدقة كاملة.
                </p>
              </div>

              {/* Interactive Stage Segmented Control */}
              <div className="flex flex-wrap items-center gap-1.5" role="tablist">
                {STAGE_ORDER.map((st) => {
                  const count = st === 'ALL' ? project.images.length : stageCounts[st] || 0;
                  if (st !== 'ALL' && count === 0) return null;
                  const label = st === 'ALL' ? 'جميع المراحل' : IMAGE_STAGE_AR[st];
                  return (
                    <button
                      key={st}
                      type="button"
                      role="tab"
                      aria-selected={selectedStage === st}
                      onClick={() => setSelectedStage(st)}
                      className={`min-h-10 rounded-full px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706] ${
                        selectedStage === st
                          ? 'bg-[#D97706] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
              {filteredImages.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-right transition-colors hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
                >
                  <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                    <ImageWithFallback
                      src={img.thumbnailUrl || img.url}
                      alt={img.altText || project.title}
                      fallbackTitle={IMAGE_STAGE_AR[img.stage]}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                    <span className="absolute left-3 bottom-3 w-8 h-8 rounded bg-black/65 text-white inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="p-3.5 space-y-1">
                    <div className="text-xs font-semibold text-[#B45309]">
                      {IMAGE_STAGE_AR[img.stage]}
                    </div>
                    {img.altText && (
                      <p className="text-xs text-slate-600 line-clamp-2">{img.altText}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Fullscreen Lightbox */}
      {activeLightboxImage && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto overscroll-contain bg-black/95 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="mb-4 flex w-full max-w-5xl items-start justify-between gap-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm">
              <span className="font-semibold text-[#F59E0B]">
                {IMAGE_STAGE_AR[activeLightboxImage.stage]}
              </span>
              {activeLightboxImage.altText && (
                <span className="text-slate-300 mr-3">· {activeLightboxImage.altText}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              aria-label="إغلاق العارض"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="relative w-full max-w-5xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeLightboxImage.url}
              alt={activeLightboxImage.altText || project.title}
              referrerPolicy="no-referrer"
              className="max-h-[75vh] max-w-full rounded-md object-contain"
            />
            {filteredImages.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="الصورة السابقة"
                  onClick={() =>
                    setLightboxIndex(
                      (lightboxIndex - 1 + filteredImages.length) % filteredImages.length,
                    )
                  }
                  className="absolute right-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-4"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="الصورة التالية"
                  onClick={() => setLightboxIndex((lightboxIndex + 1) % filteredImages.length)}
                  className="absolute left-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-4"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          <div className="mt-4 text-xs font-mono tabular-nums text-slate-400">
            {lightboxIndex + 1} / {filteredImages.length}
          </div>
        </div>
      )}
    </div>
  );
}
