import { useState, type FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { api, ApiError } from '../lib/api';

interface ContactFormCardProps {
  defaultSubject?: string;
}

export function ContactFormCard({ defaultSubject = '' }: ContactFormCardProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot hidden field per SOP 9.5

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setGeneralError(null);
    setFieldErrors({});
    setSuccessMsg(null);

    try {
      const res = await api.submitContactMessage({
        fullName,
        phone,
        email: email.trim() || undefined,
        subject: subject.trim() || undefined,
        message,
        website,
      });
      setSuccessMsg(res.message);
      setFullName('');
      setPhone('');
      setEmail('');
      setSubject('');
      setMessage('');
      setWebsite('');
    } catch (err) {
      if (err instanceof ApiError) {
        setGeneralError(err.message);
        if (err.problem.errors) {
          setFieldErrors(err.problem.errors);
        }
      } else {
        setGeneralError('تعذّر إرسال الرسالة. يرجى المحاولة مجدداً.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (successMsg) {
    return (
      <div role="status" aria-live="polite" className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <h3 className="text-lg font-bold text-slate-900">تم استلام استفسارك بنجاح</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{successMsg}</p>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="min-h-11 rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
          >
            إرسال استفسار آخر
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-8 lg:p-9"
      noValidate
    >
      <div className="space-y-2 border-b border-slate-100 pb-5">
        <p className="text-xs font-semibold text-[#B45309]">طلب معاينة أو عرض سعر</p>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          أخبرنا عن مشروعك
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          املأ التفاصيل التالية، وسيتواصل معك الفريق الهندسي لمناقشة الخطوة المناسبة.
        </p>
      </div>

      {/* Hidden Honeypot field (must remain empty for human visitors) */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="hp_website">Website</label>
        <input
          id="hp_website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {generalError && (
        <div
          role="alert"
          className="p-3.5 rounded-md bg-red-50 border border-red-200 text-sm text-red-800"
        >
          {generalError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="c_fullName" className="block text-sm font-semibold text-slate-800 mb-1.5">
            الاسم الكامل <span className="text-red-600">*</span>
          </label>
          <input
            id="c_fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="مثال: م. خالد العتيبي"
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm transition placeholder:text-slate-400 focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            aria-invalid={Boolean(fieldErrors.fullName)}
            aria-describedby={fieldErrors.fullName ? 'c_fullName_error' : undefined}
          />
          {fieldErrors.fullName && (
            <p id="c_fullName_error" className="mt-1 text-xs text-red-700">{fieldErrors.fullName[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="c_phone" className="block text-sm font-semibold text-slate-800 mb-1.5">
            رقم الهاتف / الواتساب <span className="text-red-600">*</span>
          </label>
          <input
            id="c_phone"
            type="tel"
            dir="ltr"
            required
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+966 5X XXX XXXX"
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-right text-sm font-mono tabular-nums transition placeholder:text-slate-400 focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? 'c_phone_error' : undefined}
          />
          {fieldErrors.phone && (
            <p id="c_phone_error" className="mt-1 text-xs text-red-700">{fieldErrors.phone[0]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="c_email" className="block text-sm font-semibold text-slate-800 mb-1.5">
            البريد الإلكتروني (اختياري)
          </label>
          <input
            id="c_email"
            type="email"
            dir="ltr"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.sa"
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-right text-sm font-mono transition placeholder:text-slate-400 focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'c_email_error' : undefined}
          />
          {fieldErrors.email && (
            <p id="c_email_error" className="mt-1 text-xs text-red-700">{fieldErrors.email[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="c_subject" className="block text-sm font-semibold text-slate-800 mb-1.5">
            نوع المشروع أو الخدمة (اختياري)
          </label>
          <input
            id="c_subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="مثال: عزل سطح تجاري أو خزان مياه"
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm transition placeholder:text-slate-400 focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            aria-invalid={Boolean(fieldErrors.subject)}
            aria-describedby={fieldErrors.subject ? 'c_subject_error' : undefined}
          />
          {fieldErrors.subject && (
            <p id="c_subject_error" className="mt-1 text-xs text-red-700">{fieldErrors.subject[0]}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="c_message" className="block text-sm font-semibold text-slate-800 mb-1.5">
          تفاصيل الطلب أو الموقع <span className="text-red-600">*</span>
        </label>
        <textarea
          id="c_message"
          rows={4}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اذكر المساحة التقريبية، المدينة، ونوع العزل المطلوب أو مشكلة التسرب..."
          className="min-h-32 w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 transition placeholder:text-slate-400 focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? 'c_message_error' : undefined}
        />
        {fieldErrors.message && (
          <p id="c_message_error" className="mt-1 text-xs text-red-700">{fieldErrors.message[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#D97706] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#B45309] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        <Send className="w-4 h-4" />
        <span>{submitting ? 'جاري إرسال الطلب...' : 'إرسال طلب المعاينة'}</span>
      </button>
    </form>
  );
}
