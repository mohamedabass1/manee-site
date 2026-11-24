import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { api, ApiError } from '../../lib/api';

interface AdminSettingsViewProps {
  onNotify: (msg: string, tone?: 'success' | 'error') => void;
  onSettingsUpdated: () => void;
}

export function AdminSettingsView({ onNotify, onSettingsUpdated }: AdminSettingsViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [siteName, setSiteName] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [aboutTitle, setAboutTitle] = useState('');
  const [aboutText, setAboutText] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [xUrl, setXUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAdminSiteSettings()
      .then((s) => {
        setSiteName(s.siteName || '');
        setHeroTitle(s.heroTitle || '');
        setHeroSubtitle(s.heroSubtitle || '');
        setAboutTitle(s.aboutTitle || '');
        setAboutText(s.aboutText || '');
        setPhone(s.phone || '');
        setWhatsAppNumber(s.whatsAppNumber || '');
        setEmail(s.email || '');
        setAddress(s.address || '');
        setWorkingHours(s.workingHours || '');
        setFacebookUrl(s.facebookUrl || '');
        setInstagramUrl(s.instagramUrl || '');
        setXUrl(s.xUrl || '');
        setYoutubeUrl(s.youtubeUrl || '');
        setNotificationEmail(s.notificationEmail || '');
      })
      .catch((err) => {
        onNotify(err instanceof Error ? err.message : 'تعذّر تحميل إعدادات الموقع.', 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      await api.updateAdminSiteSettings({
        siteName,
        heroTitle: heroTitle.trim() || null,
        heroSubtitle: heroSubtitle.trim() || null,
        aboutTitle: aboutTitle.trim() || null,
        aboutText: aboutText.trim() || null,
        phone: phone.trim() || null,
        whatsAppNumber: whatsAppNumber.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        workingHours: workingHours.trim() || null,
        facebookUrl: facebookUrl.trim() || null,
        instagramUrl: instagramUrl.trim() || null,
        xUrl: xUrl.trim() || null,
        youtubeUrl: youtubeUrl.trim() || null,
        notificationEmail: notificationEmail.trim() || null,
      });
      onNotify('تم حفظ إعدادات الموقع بنجاح.');
      onSettingsUpdated();
    } catch (err) {
      if (err instanceof ApiError) {
        onNotify(err.message, 'error');
        if (err.problem.errors) setFieldErrors(err.problem.errors);
      } else {
        onNotify('تعذّر حفظ الإعدادات.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (newPassword !== confirmNewPassword) {
      setPwdError('تأكيد كلمة المرور الجديدة غير مطابق.');
      return;
    }
    setSavingPwd(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      onNotify('تم تغيير كلمة المرور بنجاح.');
    } catch (err) {
      if (err instanceof ApiError) {
        const firstField = err.problem.errors
          ? Object.values(err.problem.errors).flat()[0]
          : null;
        setPwdError(firstField || err.message);
      } else {
        setPwdError('تعذّر تغيير كلمة المرور.');
      }
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) {
    return <div className="p-10 bg-white border border-slate-200 rounded-lg text-sm text-slate-500">جاري تحميل الإعدادات...</div>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wide text-[#B45309]">تخصيص المنصة</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">إعدادات الموقع</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          حدّث هوية الموقع ومعلومات التواصل، وحافظ على أمان حساب الإدارة.
        </p>
      </div>

      <form
        onSubmit={handleSaveSettings}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6 lg:p-8"
        noValidate
      >
        <div className="border-b border-slate-100 pb-5">
          <p className="mb-1 text-xs font-semibold tracking-wide text-[#B45309]">الواجهة العامة</p>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">هوية الموقع ومحتواه</h2>
          <p className="text-xs text-slate-500 mt-1">
            تُحفظ الإعدادات في صف واحد (`SiteSettings`) ويُحجب بريد الإشعارات تلقائياً عن الواجهة العامة.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              اسم الموقع / العلامة التجارية <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            />
            {fieldErrors.siteName && <p className="mt-1 text-xs text-red-700">{fieldErrors.siteName[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              بريد إشعارات الرسائل الجديدة (داخلي للمقاول)
            </label>
            <input
              type="email"
              dir="ltr"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="alerts@manee-insulation.sa"
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-right text-sm font-mono transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            />
            {fieldErrors.notificationEmail && (
              <p className="mt-1 text-xs text-red-700">{fieldErrors.notificationEmail[0]}</p>
            )}
          </div>
        </div>

        <div className="space-y-5 border-t border-slate-100 pt-5">
          <div>
            <h3 className="mb-4 text-sm font-bold text-slate-900">محتوى الصفحة الرئيسية</h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">العنوان الرئيسي للغلاف</label>
                <input
                  type="text"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">عنوان قسم من نحن</label>
                <input
                  type="text"
                  value={aboutTitle}
                  onChange={(e) => setAboutTitle(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">الوصف الفرعي للغلاف</label>
            <textarea
              rows={2}
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">نص التعريف (من نحن)</label>
            <textarea
              rows={4}
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            />
          </div>
        </div>

        <div className="space-y-5 border-t border-slate-100 pt-5">
          <div>
            <h3 className="mb-4 text-sm font-bold text-slate-900">بيانات التواصل</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">رقم الهاتف العام</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-right text-sm font-mono transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
                />
                {fieldErrors.phone && <p className="mt-1 text-xs text-red-700">{fieldErrors.phone[0]}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">رقم الواتساب</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={whatsAppNumber}
                  onChange={(e) => setWhatsAppNumber(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-right text-sm font-mono transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
                />
                {fieldErrors.whatsAppNumber && (
                  <p className="mt-1 text-xs text-red-700">{fieldErrors.whatsAppNumber[0]}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">البريد الإلكتروني العام</label>
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-right text-sm font-mono transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-red-700">{fieldErrors.email[0]}</p>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">العنوان</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">ساعات العمل</label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-bold text-slate-900">حسابات التواصل الاجتماعي</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: 'رابط فيسبوك (https://)', value: facebookUrl, setter: setFacebookUrl, key: 'facebookUrl' },
              { label: 'رابط إنستغرام (https://)', value: instagramUrl, setter: setInstagramUrl, key: 'instagramUrl' },
              { label: 'رابط إكس (https://)', value: xUrl, setter: setXUrl, key: 'xUrl' },
              { label: 'رابط يوتيوب (https://)', value: youtubeUrl, setter: setYoutubeUrl, key: 'youtubeUrl' },
            ].map((item) => (
              <div key={item.key}>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">{item.label}</label>
                <input
                  type="url"
                  dir="ltr"
                  value={item.value}
                  onChange={(e) => item.setter(e.target.value)}
                  placeholder="https://..."
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-right text-sm font-mono transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
                />
                {fieldErrors[item.key] && (
                  <p className="mt-1 text-xs text-red-700">{fieldErrors[item.key][0]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#D97706] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B45309] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706] disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
        </button>
      </form>

      {/* Change Password Card */}
      <form
        onSubmit={handleChangePassword}
        className="max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
            <KeyRound className="h-5 w-5 text-[#B45309]" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">تغيير كلمة مرور المدير</h3>
            <p className="mt-1 text-xs text-slate-500">استخدم كلمة مرور قوية لحماية لوحة الإدارة.</p>
          </div>
        </div>

        {pwdError && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800">
            {pwdError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              كلمة المرور الحالية
            </label>
            <input
              type="password"
              dir="ltr"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              كلمة المرور الجديدة
            </label>
            <input
              type="password"
              dir="ltr"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              تأكيد كلمة المرور الجديدة
            </label>
            <input
              type="password"
              dir="ltr"
              required
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          الحد الأدنى 10 أحرف مع حرف إنجليزي كبير، حرف صغير، ورقم واحد على الأقل.
        </p>

        <button
          type="submit"
          disabled={savingPwd}
          className="min-h-11 rounded-xl bg-[#0E1116] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706] disabled:opacity-50"
        >
          {savingPwd ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
        </button>
      </form>
    </div>
  );
}
