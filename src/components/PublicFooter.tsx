import type { PublicSiteSettings } from '../types/api';
import { sanitizeExternalUrl } from '../lib/api';

interface PublicFooterProps {
  settings: PublicSiteSettings | null;
  navigate: (path: string) => void;
}

export function PublicFooter({ settings, navigate }: PublicFooterProps) {
  const socials = [
    { label: 'فيسبوك', url: sanitizeExternalUrl(settings?.facebookUrl) },
    { label: 'إنستغرام', url: sanitizeExternalUrl(settings?.instagramUrl) },
    { label: 'منصة إكس', url: sanitizeExternalUrl(settings?.xUrl) },
    { label: 'يوتيوب', url: sanitizeExternalUrl(settings?.youtubeUrl) },
  ].filter((s): s is { label: string; url: string } => Boolean(s.url));

  return (
    <footer className="bg-[#0E1116] text-slate-300 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5 space-y-3">
          <div className="text-xl font-bold text-white tracking-tight">
            {settings?.siteName || 'MANEE | مَنيع'}
          </div>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md">
            {settings?.heroSubtitle ||
              'أنظمة العزل المائي والحراري والصوتي للأسطح والخزانات والمنشآت التجارية والصناعية وفق المعايير الهندسية.'}
          </p>
          {settings?.address && (
            <p className="text-xs text-slate-400 pt-1">{settings.address}</p>
          )}
        </div>

        <div className="md:col-span-3 space-y-3">
          <h3 className="text-sm font-semibold text-white">روابط الموقع</h3>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                الرئيسية
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                معرض المشاريع
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                طلب معاينة وتواصل
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                لوحة التحكم الإدارية
              </button>
            </li>
            {/* <li>
              <a
                href="/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                توثيق الواجهة البرمجية (API)
              </a>
            </li> */}
          </ul>
        </div>

        <div className="md:col-span-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">بيانات التواصل</h3>
          <div className="space-y-2 text-sm text-slate-400">
            {settings?.phone && (
              <p>
                الهاتف:{' '}
                <a
                  href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                  dir="ltr"
                  className="inline-block font-mono tabular-nums text-slate-200 hover:text-white"
                >
                  {settings.phone}
                </a>
              </p>
            )}
            {settings?.email && (
              <p>
                البريد:{' '}
                <a
                  href={`mailto:${settings.email}`}
                  dir="ltr"
                  className="inline-block font-mono text-slate-200 hover:text-white"
                >
                  {settings.email}
                </a>
              </p>
            )}
            {settings?.workingHours && <p>ساعات العمل: {settings.workingHours}</p>}
          </div>

          {socials.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors underline underline-offset-4"
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            © {new Date().getFullYear()} {settings?.siteName || 'MANEE | مَنيع'}. جميع الحقوق محفوظة.
          </span>
          <span>تنفيذ هندسي معتمد لأنظمة العزل المائي والحراري</span>
        </div>
      </div>
    </footer>
  );
}
