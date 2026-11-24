import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { api } from '../lib/api';
import {
  PROJECT_STATUS_AR,
  type PublicProjectListItem,
  type PublicService,
  type PublicSiteSettings,
} from '../types/api';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { ContactFormCard } from '../components/ContactFormCard';

const HERO_IMAGE_PATH = '/src/assets/images/hero_manee_roof_insulation_1795482426274.jpg';

interface HomePageProps {
  settings: PublicSiteSettings | null;
  navigate: (path: string) => void;
}

export function HomePage({ settings, navigate }: HomePageProps) {
  const [services, setServices] = useState<PublicService[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<PublicProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getPublicServices(),
      api.getPublicProjects({ featured: true, page: 1, pageSize: 6 }),
    ])
      .then(([svcList, projRes]) => {
        if (!active) return;
        setServices(svcList);
        if (projRes.items.length > 0) {
          setFeaturedProjects(projRes.items);
        } else {
          api.getPublicProjects({ page: 1, pageSize: 3 }).then((fallback) => {
            if (active) setFeaturedProjects(fallback.items);
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const metrics = [
    { value: '+450', label: 'مشروع عزل منجز للمنشآت السكنية والتجارية' },
    { value: '15 سنة', label: 'ضمان هندسي معتمد على أنظمة العزل' },
    { value: '+120,000 م²', label: 'إجمالي المساحات المعزولة والمختبرة ميدانياً' },
    { value: '72 ساعة', label: 'اختبار غمر مائي إلزامي قبل التسليم النهائي' },
  ];

  return (
    <div>
      {/* Hero Split — Industrial Premium Obsidian Canvas */}
      <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#0E1116] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 -z-10 h-80 w-80 rounded-full bg-[#D97706]/10 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-8 px-5 py-10 sm:px-6 sm:py-14 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <div className="flex flex-col justify-center space-y-5 lg:col-span-6 lg:space-y-6">
            <p className="text-xs font-semibold tracking-wide text-amber-400 sm:text-sm">
              أنظمة العزل الهندسي المائي والحراري والصوتي
            </p>
            <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.2] tracking-tight text-white">
              {settings?.heroTitle || 'أنظمة عزل هندسية تحمي منشآتك لعقود قادمة'}
            </h1>
            <p className="max-w-xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
              {settings?.heroSubtitle ||
                'ننفّذ أعمال العزل المائي والحراري والصوتي للأسطح والخزانات والمباني الصناعية والتجارية بأعلى المواصفات المعتمدة وبضمان حقيقي ممتد.'}
            </p>
            <div className="flex flex-col items-stretch gap-3 pt-1 sm:flex-row sm:items-center sm:gap-5 sm:pt-2">
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#D97706] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#B45309] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                اطلب معاينة فنية
              </button>
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:justify-start"
              >
                <span>تصفح معرض الأعمال</span>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="min-h-[240px] sm:min-h-[360px] lg:col-span-6 lg:min-h-[440px]">
            <div className="relative h-full min-h-[240px] overflow-hidden rounded-2xl border border-white/10 bg-[#1A2029] shadow-2xl shadow-black/30 sm:min-h-[360px] lg:min-h-0">
              <ImageWithFallback
                src={HERO_IMAGE_PATH}
                alt="سطح مبنى تجاري معزول بأنظمة العزل المائي والحراري من تنفيذ مَنيع"
                fallbackTitle="MANEE | مَنيع — عزل الأسطح والخزانات"
                className="w-full h-full object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0E1116]/45 via-transparent to-transparent"
              />
            </div>
          </div>
        </div>

        {/* Full-Width Proof Metrics Row */}
        <div className="border-t border-white/10 bg-[#131720]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-white/10">
            {metrics.map((m) => (
              <div key={m.label} className="space-y-1 px-3 py-5 sm:px-4 sm:py-6 first:pr-0 last:pl-0">
                <div className="text-xl font-bold font-mono tabular-nums text-white sm:text-3xl">
                  {m.value}
                </div>
                <div className="text-xs sm:text-sm text-slate-400 leading-snug">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section — Natural Editorial Numbering */}
      <section id="services" className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-semibold text-[#B45309]">نطاق الأعمال التخصصية</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                خدمات العزل الهندسي المعتمدة
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-[#B45309] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>استعرض المشاريع حسب الخدمة</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 rounded-lg border border-slate-200 bg-slate-50 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 shadow-sm md:grid-cols-2 lg:grid-cols-3">
              {services.map((svc, idx) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => navigate(`/services/${svc.urlSegment}`)}
                  className="group flex flex-col justify-between gap-5 border-b border-l border-slate-200 bg-white p-5 text-right transition-colors hover:bg-[#F8F9FA] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#D97706] sm:p-7"
                >
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-mono tabular-nums text-sm font-semibold text-[#B45309]">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:-translate-x-1 transition-transform" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#B45309] transition-colors">
                      {svc.name}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {svc.shortDescription}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900">
                    عرض المواصفات والمشاريع
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Projects Showcase */}
      <section className="bg-[#F4F5F6] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-semibold text-[#B45309]">توثيق ميداني لمراحل التنفيذ</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                أبرز المشاريع المنفّذة
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 hover:border-slate-900 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>كافة المشاريع</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-80 rounded-lg border border-slate-200 bg-white animate-pulse"
                />
              ))}
            </div>
          ) : featuredProjects.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-600">
              لا توجد مشاريع منشورة حالياً. يمكنك إضافة ونشر المشاريع من لوحة التحكم.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {featuredProjects.map((project) => (
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
                      {/* Zero-Pill Metadata */}
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
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#B45309] transition-colors leading-snug">
                        {project.title}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {project.shortDescription}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>عرض مراحل التنفيذ والتفاصيل</span>
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#B45309]" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About & Direct Lead Capture Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 items-start gap-8 px-5 py-12 sm:px-6 sm:py-16 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#B45309]">من نحن ولماذا مَنيع</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {settings?.aboutTitle || 'خبرة ميدانية وهندسية متخصصة في حماية المباني'}
              </h2>
            </div>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line">
              {settings?.aboutText ||
                'ننفّذ أنظمة العزل وفق فحص هندسي مسبق ومعايير جودة صارمة تشمل اختبار الغمر المائي وتوثيق كل مرحلة بالصور.'}
            </p>

            <div className="pt-4 border-t border-slate-200 space-y-3 text-sm text-slate-700">
              {settings?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#B45309] shrink-0" />
                  <a
                    href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                    dir="ltr"
                    className="font-mono tabular-nums hover:text-[#B45309]"
                  >
                    {settings.phone}
                  </a>
                </div>
              )}
              {settings?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#B45309] shrink-0" />
                  <a href={`mailto:${settings.email}`} dir="ltr" className="font-mono hover:text-[#B45309]">
                    {settings.email}
                  </a>
                </div>
              )}
              {settings?.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[#B45309] shrink-0" />
                  <span>{settings.address}</span>
                </div>
              )}
              {settings?.workingHours && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#B45309] shrink-0" />
                  <span>{settings.workingHours}</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900">اطلب معاينة أو عرض سعر فني</h3>
              <p className="text-sm text-slate-600 mt-1">
                أرسل تفاصيل المشروع وسيتواصل معك مهندس مختص خلال أوقات العمل.
              </p>
            </div>
            <ContactFormCard />
          </div>
        </div>
      </section>
    </div>
  );
}
