import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react';
import { api } from '../lib/api';
import {
  PROJECT_STATUS_AR,
  type PagedResult,
  type ProjectStatus,
  type PublicCategory,
  type PublicMaterial,
  type PublicProjectListItem,
  type PublicService,
} from '../types/api';
import { ImageWithFallback } from '../components/ImageWithFallback';

interface ProjectsPageProps {
  navigate: (path: string) => void;
  initialServiceId?: number | null;
}

export function ProjectsPage({ navigate, initialServiceId = null }: ProjectsPageProps) {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [materials, setMaterials] = useState<PublicMaterial[]>([]);

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(initialServiceId);
  const [materialId, setMaterialId] = useState<number | null>(null);
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PagedResult<PublicProjectListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getPublicCategories(),
      api.getPublicServices(),
      api.getPublicMaterials(),
    ]).then(([cats, svcs, mats]) => {
      setCategories(cats);
      setServices(svcs);
      setMaterials(mats);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getPublicProjects({
        page,
        pageSize: 9,
        categoryId,
        serviceId,
        materialId,
        status,
        search: searchQuery || undefined,
      })
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err.message || 'تعذّر تحميل قائمة المشاريع.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, categoryId, serviceId, materialId, status, searchQuery]);

  const hasFilters = Boolean(categoryId || serviceId || materialId || status || searchQuery);

  const resetFilters = () => {
    setCategoryId(null);
    setServiceId(null);
    setMaterialId(null);
    setStatus('');
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="min-h-[75vh] bg-[#F4F5F6]">
      {/* Header Band */}
      <section className="bg-[#0E1116] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto space-y-3 px-5 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold text-[#F59E0B]">سجل الأعمال الهندسية الموثّق</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">معرض مشاريع العزل</h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
            تصفّح المشاريع المنفّذة وقيد التنفيذ حسب نوع المنشأة والخدمة والمواد المعتمدة مع توثيق مراحل العمل.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto space-y-7 px-5 py-8 sm:px-6 sm:py-10 lg:space-y-8">
        {/* Interactive Filter Controls */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {/* Category Segmented Tabs */}
          <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto" role="group" aria-label="التصنيف">
              <button
                type="button"
                aria-pressed={categoryId === null}
                onClick={() => {
                  setCategoryId(null);
                  setPage(1);
                }}
                className={`min-h-10 rounded-full px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706] ${
                  categoryId === null
                    ? 'bg-[#0E1116] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                جميع المنشآت
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={categoryId === cat.id}
                  onClick={() => {
                    setCategoryId(cat.id);
                    setPage(1);
                  }}
                  className={`min-h-10 rounded-full px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706] ${
                    categoryId === cat.id
                      ? 'bg-[#0E1116] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {data && (
              <span className="text-xs font-mono tabular-nums text-slate-500">
                إجمالي النتائج: {data.totalCount}
              </span>
            )}
          </div>

          {/* Search & Dropdown Filters */}
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="البحث في المشاريع"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ابحث في العنوان أو الوصف..."
                className="min-h-11 w-full rounded-lg border border-slate-300 py-2 pl-3 pr-9 text-sm transition placeholder:text-slate-400 focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
              />
            </div>

            <select
              aria-label="تصفية حسب الخدمة"
              value={serviceId ?? ''}
              onChange={(e) => {
                setServiceId(e.target.value ? Number(e.target.value) : null);
                setPage(1);
              }}
              className="min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            >
              <option value="">كل الخدمات</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              aria-label="تصفية حسب المادة"
              value={materialId ?? ''}
              onChange={(e) => {
                setMaterialId(e.target.value ? Number(e.target.value) : null);
                setPage(1);
              }}
              className="min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            >
              <option value="">كل مواد العزل</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <select
                aria-label="تصفية حسب الحالة"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as ProjectStatus | '');
                  setPage(1);
                }}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
              >
                <option value="">كل الحالات</option>
                <option value="Completed">{PROJECT_STATUS_AR.Completed}</option>
                <option value="InProgress">{PROJECT_STATUS_AR.InProgress}</option>
                <option value="Planned">{PROJECT_STATUS_AR.Planned}</option>
              </select>

              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  title="إعادة ضبط الفلاتر"
                  className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>مسح</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-84 rounded-2xl border border-slate-200 bg-white animate-pulse"
              />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-14">
            <p className="text-base font-semibold text-slate-900">
              لا توجد مشاريع مطابقة لمعايير البحث الحالية
            </p>
            <p className="text-sm text-slate-500">
              جرّب تغيير الفلاتر أو مسح البحث لعرض جميع المشاريع المنشورة.
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#D97706] hover:bg-[#B45309] rounded-md cursor-pointer"
              >
                عرض جميع المشاريع
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {data.items.map((project) => (
                <a
                  key={project.id}
                  href={`/projects/${project.urlSegment}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-right shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
                >
                  <div className="aspect-[4/3] bg-slate-900 overflow-hidden">
                    <ImageWithFallback
                      src={project.coverImage?.thumbnailUrl || project.coverImage?.url}
                      alt={project.coverImage?.altText || project.title}
                      fallbackTitle={project.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between space-y-4 p-5 sm:p-6">
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span className="font-semibold text-[#B45309]">{project.category.name}</span>
                        {project.city && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{project.city}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{PROJECT_STATUS_AR[project.status]}</span>
                        {project.executionDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{project.executionDate}</span>
                          </>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 group-hover:text-[#B45309] transition-colors leading-snug">
                        {project.title}
                      </h2>
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {project.shortDescription}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>تفاصيل المشروع ومراحل العزل</span>
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#B45309]" />
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold transition-colors hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>
                <span className="text-sm font-mono tabular-nums text-slate-700 px-3">
                  صفحة {data.page} من {data.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold transition-colors hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
