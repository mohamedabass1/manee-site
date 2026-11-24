import { ArrowLeft, Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { PublicSiteSettings } from '../types/api';
import { ContactFormCard } from '../components/ContactFormCard';
import contactHeroImage from '../assets/images/hero_manee_roof_1795481021175.jpg';

interface ContactPageProps {
  settings: PublicSiteSettings | null;
}

export function ContactPage({ settings }: ContactPageProps) {
  const cleanWhatsappDigits = settings?.whatsAppNumber?.replace(/[^\d]/g, '') || '';

  return (
    <div className="bg-[#F4F5F6] min-h-[80vh]">
      <section className="relative isolate overflow-hidden bg-[#0E1116] text-white">
        <img
          src={contactHeroImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full object-cover object-center opacity-30"
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-l from-[#0E1116] via-[#0E1116]/90 to-[#0E1116]/55" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:py-24">
          <div className="max-w-3xl space-y-5">
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-400 sm:text-sm">
              <span className="h-px w-7 bg-amber-500" />
              تواصل مباشر مع الفريق الهندسي
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              خطوتك الأولى نحو
              <span className="block text-amber-400">منشأة أكثر أماناً</span>
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
              شاركنا تفاصيل مشروعك أو مشكلة التسرب، وسندرس احتياجك ونتواصل معك لتحديد موعد الفحص الميداني.
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <a
                href="#contact-form"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#D97706] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#B45309] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                اطلب معاينة فنية
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </a>
              {settings?.phone && (
                <a
                  href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                  dir="ltr"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-slate-100 transition-colors hover:border-white/50 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {settings.phone}
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-3 text-xs text-slate-300 sm:text-sm">
              <span>فحص ميداني</span>
              <span aria-hidden="true" className="text-amber-500">•</span>
              <span>حلول تناسب موقعك</span>
              <span aria-hidden="true" className="text-amber-500">•</span>
              <span>متابعة من الفريق الهندسي</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 px-5 py-8 sm:px-6 sm:py-12 lg:grid-cols-12 lg:gap-8">
        <aside className="space-y-4 lg:col-span-5">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A2029] to-[#0E1116] p-5 text-white shadow-xl shadow-slate-900/10 sm:p-7">
            <div className="mb-5 space-y-2">
              <p className="text-xs font-semibold text-amber-400">على تواصل معك</p>
              <h2 className="text-xl font-bold sm:text-2xl">تواصل بالطريقة الأنسب لك</h2>
              <p className="text-sm leading-6 text-slate-300">
                فريقنا جاهز لمساعدتك في اختيار الحل الهندسي المناسب.
              </p>
            </div>
            <div className="space-y-3">
              {settings?.phone && (
                <a
                  href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-amber-500/40 hover:bg-white/[0.06]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                    <Phone className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 space-y-1">
                    <span className="block text-xs text-slate-400">رقم الهاتف المباشر</span>
                    <span
                      dir="ltr"
                      className="inline-block break-all text-sm font-bold font-mono tabular-nums text-white sm:text-base"
                    >
                      {settings.phone}
                    </span>
                  </span>
                </a>
              )}

              {cleanWhatsappDigits && (
                <a
                  href={`https://wa.me/${cleanWhatsappDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-amber-500/40 hover:bg-white/[0.06]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                    <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 space-y-1">
                    <span className="block text-xs text-slate-400">محادثة واتساب سريعة</span>
                    <span
                      dir="ltr"
                      className="inline-block break-all text-sm font-bold font-mono tabular-nums text-white sm:text-base"
                    >
                      {settings?.whatsAppNumber}
                    </span>
                  </span>
                </a>
              )}

              {settings?.email && (
                <a
                  href={`mailto:${settings.email}`}
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-amber-500/40 hover:bg-white/[0.06]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                    <Mail className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 space-y-1">
                    <span className="block text-xs text-slate-400">البريد الإلكتروني</span>
                    <span
                      dir="ltr"
                      className="inline-block break-all text-sm font-semibold font-mono text-white"
                    >
                      {settings.email}
                    </span>
                  </span>
                </a>
              )}

              {settings?.address && (
                <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs text-slate-400">العنوان</div>
                    <p className="text-sm font-medium leading-6 text-white">{settings.address}</p>
                  </div>
                </div>
              )}

              {settings?.workingHours && (
                <div className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                    <Clock className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs text-slate-400">ساعات العمل</div>
                    <p className="text-sm font-medium leading-6 text-white">{settings.workingHours}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section id="contact-form" className="scroll-mt-24 lg:col-span-7">
          <ContactFormCard />
        </section>
      </div>
    </div>
  );
}
