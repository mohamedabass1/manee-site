import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { api, ApiError, setAuthToken } from '../../lib/api';
import type { SetupStatus } from '../../types/api';

interface AdminAuthScreenProps {
  onAuthenticated: () => void;
  navigate: (path: string) => void;
}

export function AdminAuthScreen({ onAuthenticated, navigate }: AdminAuthScreenProps) {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('مدير منصة مَنيع');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    api
      .getAuthSetupStatus()
      .then((res) => {
        setSetupStatus(res);
      })
      .catch(() => {
        setSetupStatus({ needsSetup: false, envPasswordConfigured: false });
      })
      .finally(() => setLoadingStatus(false));
  }, []);

  const handleBootstrap = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: ['تأكيد كلمة المرور غير مطابق.'] });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.bootstrapAdmin({ username, fullName, password });
      setAuthToken(res.accessToken, res.expiresAtUtc);
      onAuthenticated();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.problem.errors) setFieldErrors(err.problem.errors);
      } else {
        setError('تعذّر إتمام إعداد الحساب.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await api.login({ username, password });
      setAuthToken(res.accessToken, res.expiresAtUtc);
      onAuthenticated();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.problem.errors) setFieldErrors(err.problem.errors);
      } else {
        setError('تعذّر تسجيل الدخول. يرجى المحاولة مجدداً.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6">
        <div className="h-80 w-full max-w-md animate-pulse rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5" />
      </div>
    );
  }

  const isSetup = setupStatus?.needsSetup === true;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_#fff7ed_0%,_#f8fafc_42%,_#f1f5f9_100%)] p-4 sm:p-6 lg:flex lg:items-center lg:justify-center lg:p-10">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 lg:min-h-[min(760px,calc(100vh-5rem))] lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-[#0E1116] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(217,119,6,0.28),_transparent_34%)]" />
          <div className="relative">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D97706] text-lg font-black">
              م
            </span>
          </div>
          <div className="relative max-w-lg space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-amber-200">
              <ShieldCheck className="h-4 w-4" />
              مساحة عمل آمنة
            </span>
            <h2 className="text-4xl font-bold leading-[1.35] tracking-tight xl:text-5xl">
              إدارة أعمالك،
              <span className="block text-amber-400">بكل وضوح.</span>
            </h2>
            <p className="max-w-md text-sm leading-7 text-slate-300">
              مكان واحد لإدارة المشاريع والصور ورسائل العملاء وإعدادات الموقع.
            </p>
            <div className="grid gap-3 pt-2">
              {['نظّم مشاريعك ومعرض أعمالك', 'تابع رسائل واستفسارات العملاء', 'حدّث بيانات الموقع بسهولة'].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="relative flex items-center justify-between border-t border-white/10 pt-5 text-xs text-slate-400">
            <span>MANEE | مَنيع</span>
            <button type="button" onClick={() => navigate('/')} className="transition-colors hover:text-white">
              زيارة الموقع العام
            </button>
          </div>
        </section>

        <div className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-lg font-bold tracking-tight text-slate-900 lg:hidden"
          >
            MANEE | مَنيع
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>الموقع العام</span>
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#B45309]">
              {isSetup ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{isSetup ? 'التهيئة الأولية لمرة واحدة' : 'بوابة إدارة المحتوى'}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {isSetup ? 'إعداد حساب المدير الأول' : 'تسجيل الدخول للوحة التحكم'}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isSetup
                ? 'لم يتم ضبط كلمة مرور مدير في متغيرات البيئة بعد. عيّن بيانات المدير الآن لتأمين لوحة التحكم.'
                : 'أدخل اسم المستخدم وكلمة المرور للوصول إلى إدارة المشاريع والصور والرسائل.'}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 sm:text-sm"
            >
              {error}
            </div>
          )}

          {isSetup ? (
            <form onSubmit={handleBootstrap} className="space-y-4" noValidate>
              <div>
                <label htmlFor="admin-setup-username" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  اسم المستخدم
                </label>
                <input
                  type="text"
                  id="admin-setup-username"
                  dir="ltr"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-right text-sm font-mono transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
                />
                {fieldErrors.username && (
                  <p className="mt-1 text-xs text-red-700">{fieldErrors.username[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="admin-setup-name" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  id="admin-setup-name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
                />
                {fieldErrors.fullName && (
                  <p className="mt-1 text-xs text-red-700">{fieldErrors.fullName[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="admin-setup-password" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  id="admin-setup-password"
                  dir="ltr"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="10 أحرف فأكثر (حرف كبير وصغير ورقم)"
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-700">{fieldErrors.password[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="admin-setup-confirm-password" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  id="admin-setup-confirm-password"
                  dir="ltr"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-700">{fieldErrors.confirmPassword[0]}</p>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                سياسة كلمة المرور المعتمدة: 10 أحرف على الأقل تتضمن حرفاً إنجليزياً كبيراً، حرفاً صغيراً، ورقماً.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="min-h-12 w-full rounded-xl bg-[#D97706] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#B45309] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706] disabled:opacity-60"
              >
                {submitting ? 'جاري إنشاء الحساب...' : 'إنشاء حساب المدير والدخول'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div>
                <label htmlFor="admin-login-username" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  اسم المستخدم
                </label>
                <input
                  type="text"
                  id="admin-login-username"
                  dir="ltr"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-right text-sm font-mono transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
                />
                {fieldErrors.username && <p className="mt-1 text-xs text-red-700">{fieldErrors.username[0]}</p>}
              </div>

              <div>
                <label htmlFor="admin-login-password" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  id="admin-login-password"
                  dir="ltr"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
                />
                {fieldErrors.password && <p className="mt-1 text-xs text-red-700">{fieldErrors.password[0]}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D97706] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#B45309] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706] disabled:opacity-60"
              >
                <KeyRound className="w-4 h-4" />
                <span>{submitting ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
