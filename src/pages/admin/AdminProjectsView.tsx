import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Edit2,
  Eye,
  EyeOff,
  ImagePlus,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import {
  IMAGE_STAGE_AR,
  PROJECT_STATUS_AR,
  type AdminCategory,
  type AdminMaterial,
  type AdminProjectDetails,
  type AdminProjectImage,
  type AdminProjectListItem,
  type AdminService,
  type ImageStage,
  type PagedResult,
  type ProjectStatus,
} from '../../types/api';
import { ImageWithFallback } from '../../components/ImageWithFallback';

interface AdminProjectsViewProps {
  initialOpenCreate?: boolean;
  onNotify: (msg: string, tone?: 'success' | 'error') => void;
}

export function AdminProjectsView({
  initialOpenCreate = false,
  onNotify,
}: AdminProjectsViewProps) {
  const [mode, setMode] = useState<'list' | 'form'>(initialOpenCreate ? 'form' : 'list');
  const [editingProject, setEditingProject] = useState<AdminProjectDetails | null>(null);

  // Lookups
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [services, setServices] = useState<AdminService[]>([]);
  const [materials, setMaterials] = useState<AdminMaterial[]>([]);

  // List state
  const [listData, setListData] = useState<PagedResult<AdminProjectListItem> | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | ''>('');
  const [filterPublished, setFilterPublished] = useState<boolean | ''>('');
  const [page, setPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [status, setStatus] = useState<ProjectStatus>('Completed');
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [city, setCity] = useState('');
  const [executionDate, setExecutionDate] = useState('');
  const [areaInSquareMeters, setAreaInSquareMeters] = useState('');
  const [durationInDays, setDurationInDays] = useState('');
  const [clientName, setClientName] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [materialIds, setMaterialIds] = useState<number[]>([]);
  const [rowVersion, setRowVersion] = useState<number>(1);
  const [savingForm, setSavingForm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [formBannerError, setFormBannerError] = useState<string | null>(null);

  // Image Studio state
  const [images, setImages] = useState<AdminProjectImage[]>([]);
  const [uploadStage, setUploadStage] = useState<ImageStage>('After');
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [editingImgMeta, setEditingImgMeta] = useState<Record<number, { stage: ImageStage; altText: string }>>({});
  const multiUploadRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    Promise.all([
      api.getAdminCategories(),
      api.getAdminServices(),
      api.getAdminMaterials(),
    ]).then(([cats, svcs, mats]) => {
      setCategories(cats);
      setServices(svcs);
      setMaterials(mats);
      if (cats.length > 0 && categoryId === '') {
        const firstActive = cats.find((c) => c.isActive) || cats[0];
        setCategoryId(firstActive.id);
      }
    });
  }, []);

  const loadList = async () => {
    setLoadingList(true);
    try {
      const res = await api.getAdminProjects({
        page,
        pageSize: 15,
        categoryId: filterCategoryId,
        status: filterStatus,
        isPublished: filterPublished,
        search: search.trim() || undefined,
      });
      setListData(res);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذّر تحميل المشاريع.', 'error');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (mode === 'list') {
      void loadList();
    }
  }, [mode, page, filterCategoryId, filterStatus, filterPublished, search]);

  const populateForm = (proj: AdminProjectDetails | null) => {
    setFormErrors({});
    setFormBannerError(null);
    setOrderDirty(false);

    if (!proj) {
      setEditingProject(null);
      setTitle('');
      setSlug('');
      setShortDescription('');
      setDescription('');
      const firstActive = categories.find((c) => c.isActive) || categories[0];
      setCategoryId(firstActive ? firstActive.id : '');
      setStatus('Completed');
      setIsPublished(false);
      setIsFeatured(false);
      setCity('');
      setExecutionDate('');
      setAreaInSquareMeters('');
      setDurationInDays('');
      setClientName('');
      setDisplayOrder(0);
      setServiceIds([]);
      setMaterialIds([]);
      setRowVersion(1);
      setImages([]);
      setEditingImgMeta({});
      return;
    }

    setEditingProject(proj);
    setTitle(proj.title);
    setSlug(proj.slug || '');
    setShortDescription(proj.shortDescription);
    setDescription(proj.description);
    setCategoryId(proj.categoryId);
    setStatus(proj.status);
    setIsPublished(proj.isPublished);
    setIsFeatured(proj.isFeatured);
    setCity(proj.city || '');
    setExecutionDate(proj.executionDate || '');
    setAreaInSquareMeters(proj.areaInSquareMeters != null ? String(proj.areaInSquareMeters) : '');
    setDurationInDays(proj.durationInDays != null ? String(proj.durationInDays) : '');
    setClientName(proj.clientName || '');
    setDisplayOrder(proj.displayOrder);
    setServiceIds(proj.serviceIds);
    setMaterialIds(proj.materialIds);
    setRowVersion(proj.rowVersion);
    setImages(proj.images);

    const metaMap: Record<number, { stage: ImageStage; altText: string }> = {};
    for (const img of proj.images) {
      metaMap[img.id] = { stage: img.stage, altText: img.altText || '' };
    }
    setEditingImgMeta(metaMap);
  };

  const openCreate = () => {
    populateForm(null);
    setMode('form');
  };

  const openEdit = async (id: number) => {
    try {
      const detail = await api.getAdminProjectById(id);
      populateForm(detail);
      setMode('form');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذّر فتح المشروع.', 'error');
    }
  };

  const refreshEditingProject = async (id: number) => {
    const detail = await api.getAdminProjectById(id);
    populateForm(detail);
  };

  const toggleId = (list: number[], id: number, setter: (v: number[]) => void) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSaveProject = async (e: FormEvent) => {
    e.preventDefault();
    setSavingForm(true);
    setFormErrors({});
    setFormBannerError(null);

    const payload: Record<string, unknown> = {
      title,
      slug: slug.trim() || null,
      shortDescription,
      description,
      categoryId: Number(categoryId),
      status,
      isPublished,
      isFeatured,
      city: city.trim() || null,
      executionDate: executionDate.trim() || null,
      areaInSquareMeters: areaInSquareMeters.trim() ? Number(areaInSquareMeters) : null,
      durationInDays: durationInDays.trim() ? Number(durationInDays) : null,
      clientName: clientName.trim() || null,
      displayOrder: Number(displayOrder) || 0,
      serviceIds,
      materialIds,
    };

    try {
      if (editingProject) {
        payload.rowVersion = rowVersion;
        const updated = await api.updateProject(editingProject.id, payload);
        populateForm(updated);
        onNotify('تم حفظ تعديلات المشروع بنجاح.');
      } else {
        const created = await api.createProject(payload);
        populateForm(created);
        onNotify('تم إنشاء المشروع بنجاح. يمكنك الآن رفع صور مراحل التنفيذ أدناه.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setFormBannerError(err.message);
        if (err.problem.errors) setFormErrors(err.problem.errors);
      } else {
        setFormBannerError('حدث خطأ أثناء حفظ المشروع.');
      }
    } finally {
      setSavingForm(false);
    }
  };

  const handleTogglePublish = async (proj: AdminProjectListItem) => {
    try {
      await api.toggleProjectPublish(proj.id, !proj.isPublished);
      onNotify(!proj.isPublished ? 'تم نشر المشروع للعامة.' : 'تم تحويل المشروع إلى مسودة.');
      await loadList();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذّر تحديث حالة النشر.', 'error');
    }
  };

  const handleSoftDelete = async (id: number) => {
    try {
      await api.deleteProject(id);
      setDeleteConfirmId(null);
      onNotify('تم حذف المشروع (Soft Delete) بنجاح.');
      await loadList();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذّر حذف المشروع.', 'error');
    }
  };

  // ---- IMAGE STUDIO HANDLERS ----
  const handleMultiUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!editingProject || !e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    e.target.value = '';
    setUploading(true);
    try {
      await api.uploadProjectImages(editingProject.id, files, uploadStage, uploadAltText);
      setUploadAltText('');
      await refreshEditingProject(editingProject.id);
      onNotify(`تم رفع ومعالجة ${files.length} صورة بنجاح.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'فشل رفع الصور.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveImageMeta = async (imageId: number) => {
    if (!editingProject) return;
    const meta = editingImgMeta[imageId];
    if (!meta) return;
    try {
      await api.updateImageMetadata(editingProject.id, imageId, {
        stage: meta.stage,
        altText: meta.altText.trim() || null,
      });
      await refreshEditingProject(editingProject.id);
      onNotify('تم تحديث بيانات الصورة.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذّر تحديث بيانات الصورة.', 'error');
    }
  };

  const handleReplaceFile = async (imageId: number, e: ChangeEvent<HTMLInputElement>) => {
    if (!editingProject || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    e.target.value = '';
    try {
      await api.replaceImageFile(editingProject.id, imageId, file);
      await refreshEditingProject(editingProject.id);
      onNotify('تم استبدال ملف الصورة ومعالجته بنجاح.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذّر استبدال ملف الصورة.', 'error');
    }
  };

  const handleSetCover = async (imageId: number) => {
    if (!editingProject) return;
    try {
      await api.setCoverImage(editingProject.id, imageId);
      await refreshEditingProject(editingProject.id);
      onNotify('تم تعيين صورة الغلاف بنجاح.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذّر تعيين الغلاف.', 'error');
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!editingProject) return;
    try {
      await api.deleteProjectImage(editingProject.id, imageId);
      await refreshEditingProject(editingProject.id);
      onNotify('تم حذف الصورة.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذّر حذف الصورة.', 'error');
    }
  };

  const moveImage = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[idx], next[target]] = [next[target], next[idx]];
    setImages(next);
    setOrderDirty(true);
  };

  const handleSaveOrder = async () => {
    if (!editingProject) return;
    setSavingOrder(true);
    try {
      await api.reorderImages(
        editingProject.id,
        images.map((i) => i.id),
      );
      await refreshEditingProject(editingProject.id);
      onNotify('تم حفظ ترتيب الصور الجديد.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذّر حفظ الترتيب.', 'error');
    } finally {
      setSavingOrder(false);
    }
  };

  // ---- FORM VIEW ----
  if (mode === 'form') {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setMode('list')}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لقائمة المشاريع</span>
          </button>

          {editingProject && (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono tabular-nums text-slate-500">
              ID #{editingProject.id} · RowVersion v{rowVersion}
            </span>
          )}
        </div>

        <form
          onSubmit={handleSaveProject}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6 lg:p-8"
          noValidate
        >
          <div className="border-b border-slate-100 pb-5">
            <p className="mb-1 text-xs font-semibold tracking-wide text-[#B45309]">تفاصيل المشروع</p>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {editingProject ? `تعديل المشروع: ${editingProject.title}` : 'إضافة مشروع عزل جديد'}
            </h2>
          </div>

          {formBannerError && (
            <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
              {formBannerError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                عنوان المشروع <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
              />
              {formErrors.title && <p className="mt-1 text-xs text-red-700">{formErrors.title[0]}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                الرابط المختصر Slug (لاتيني اختياري)
              </label>
              <input
                type="text"
                dir="ltr"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="roof-waterproofing-riyadh"
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-right text-sm font-mono transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
              />
              {formErrors.slug && <p className="mt-1 text-xs text-red-700">{formErrors.slug[0]}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              الوصف المختصر (يظهر في بطاقة المعرض) <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            />
            {formErrors.shortDescription && (
              <p className="mt-1 text-xs text-red-700">{formErrors.shortDescription[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              الوصف التفصيلي الكامل <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={5}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            />
            {formErrors.description && (
              <p className="mt-1 text-xs text-red-700">{formErrors.description[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                نوع المنشأة (التصنيف) <span className="text-red-600">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#D97706]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {!c.isActive ? '(موقوف)' : ''}
                  </option>
                ))}
              </select>
              {formErrors.categoryId && (
                <p className="mt-1 text-xs text-red-700">{formErrors.categoryId[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">حالة المشروع</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#D97706]"
              >
                <option value="Completed">{PROJECT_STATUS_AR.Completed}</option>
                <option value="InProgress">{PROJECT_STATUS_AR.InProgress}</option>
                <option value="Planned">{PROJECT_STATUS_AR.Planned}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">المدينة</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#D97706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">تاريخ التنفيذ</label>
              <input
                type="date"
                value={executionDate}
                onChange={(e) => setExecutionDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:border-[#D97706]"
              />
              {formErrors.executionDate && (
                <p className="mt-1 text-xs text-red-700">{formErrors.executionDate[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">المساحة (م²)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={areaInSquareMeters}
                onChange={(e) => setAreaInSquareMeters(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:border-[#D97706]"
              />
              {formErrors.areaInSquareMeters && (
                <p className="mt-1 text-xs text-red-700">{formErrors.areaInSquareMeters[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                مدة التنفيذ (أيام)
              </label>
              <input
                type="number"
                min="1"
                value={durationInDays}
                onChange={(e) => setDurationInDays(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:border-[#D97706]"
              />
              {formErrors.durationInDays && (
                <p className="mt-1 text-xs text-red-700">{formErrors.durationInDays[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                اسم العميل (داخلي — لا يظهر للعامة)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#D97706]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">ترتيب العرض</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:border-[#D97706]"
              />
            </div>
          </div>

          {/* Services & Materials Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="border border-slate-200 rounded-md p-4 space-y-3">
              <div className="text-xs font-bold text-slate-800">
                الخدمات المرتبطة <span className="text-red-600">*</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serviceIds.includes(s.id)}
                      onChange={() => toggleId(serviceIds, s.id, setServiceIds)}
                      className="accent-[#D97706]"
                    />
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
              {formErrors.serviceIds && (
                <p className="text-xs text-red-700">{formErrors.serviceIds[0]}</p>
              )}
            </div>

            <div className="border border-slate-200 rounded-md p-4 space-y-3">
              <div className="text-xs font-bold text-slate-800">مواد العزل المستخدمة (اختياري)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {materials.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={materialIds.includes(m.id)}
                      onChange={() => toggleId(materialIds, m.id, setMaterialIds)}
                      className="accent-[#D97706]"
                    />
                    <span>{m.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Visibility Switches */}
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 accent-[#D97706]"
              />
              <span>منشور في الموقع العام</span>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 accent-[#D97706]"
              />
              <span>مشروع مميز في الصفحة الرئيسية</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingForm}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 rounded-md cursor-pointer"
            >
              {savingForm ? 'جاري الحفظ...' : editingProject ? 'حفظ التعديلات' : 'إنشاء المشروع'}
            </button>
            <button
              type="button"
              onClick={() => setMode('list')}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
            >
              رجوع
            </button>
          </div>
        </form>

        {/* Project Image Studio (Active after project exists) */}
        {editingProject && (
          <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  استوديو صور المشروع ومراحل التنفيذ ({images.length} / 40)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  يدعم رفع حتى 10 صور دفعة واحدة (JPG, PNG, WebP بحد أقصى 8MB)، مع إزالة EXIF وتوليد مصغّرات WebP تلقائياً.
                </p>
              </div>
              {orderDirty && (
                <button
                  type="button"
                  disabled={savingOrder}
                  onClick={handleSaveOrder}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0E1116] hover:bg-slate-800 rounded-md cursor-pointer"
                >
                  {savingOrder ? 'جاري حفظ الترتيب...' : 'حفظ الترتيب الجديد'}
                </button>
              )}
            </div>

            {/* Upload Bar */}
            <div className="grid grid-cols-1 items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-12 sm:p-5">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  مرحلة التنفيذ للصور المرفوعة
                </label>
                <select
                  value={uploadStage}
                  onChange={(e) => setUploadStage(e.target.value as ImageStage)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                >
                  <option value="Before">{IMAGE_STAGE_AR.Before}</option>
                  <option value="During">{IMAGE_STAGE_AR.During}</option>
                  <option value="After">{IMAGE_STAGE_AR.After}</option>
                  <option value="General">{IMAGE_STAGE_AR.General}</option>
                </select>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الوصف البديل (اختياري — ينطبق على الصور المرفوعة)
                </label>
                <input
                  type="text"
                  value={uploadAltText}
                  onChange={(e) => setUploadAltText(e.target.value)}
                  placeholder="مثال: طبقة فوم البولي يوريثان بعد الرش"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  ref={multiUploadRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleMultiUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => multiUploadRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 rounded-md cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'جاري الرفع...' : 'اختيار ورفع صور'}</span>
                </button>
              </div>
            </div>

            {/* Uploaded Images List */}
            {images.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 space-y-2">
                <ImagePlus className="w-7 h-7 text-slate-400 mx-auto" />
                <p>لا توجد صور لهذا المشروع بعد. أول صورة تُرفع تصبح صورة الغلاف تلقائياً.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {images.map((img, idx) => {
                  const meta = editingImgMeta[img.id] || {
                    stage: img.stage,
                    altText: img.altText || '',
                  };
                  return (
                    <div
                      key={img.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3.5 border border-slate-200 rounded-lg bg-white"
                    >
                      <div className="md:col-span-3 flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveImage(idx, -1)}
                            className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                            title="تحريك لأعلى"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === images.length - 1}
                            onClick={() => moveImage(idx, 1)}
                            className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                            title="تحريك لأسفل"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="w-28 aspect-[4/3] rounded overflow-hidden border border-slate-200 bg-slate-900 shrink-0">
                          <ImageWithFallback
                            src={img.thumbnailUrl}
                            alt={img.altText || img.originalFileName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">المرحلة</label>
                          <select
                            value={meta.stage}
                            onChange={(e) =>
                              setEditingImgMeta((prev) => ({
                                ...prev,
                                [img.id]: { ...meta, stage: e.target.value as ImageStage },
                              }))
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                          >
                            <option value="Before">{IMAGE_STAGE_AR.Before}</option>
                            <option value="During">{IMAGE_STAGE_AR.During}</option>
                            <option value="After">{IMAGE_STAGE_AR.After}</option>
                            <option value="General">{IMAGE_STAGE_AR.General}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">الوصف البديل</label>
                          <input
                            type="text"
                            value={meta.altText}
                            onChange={(e) =>
                              setEditingImgMeta((prev) => ({
                                ...prev,
                                [img.id]: { ...meta, altText: e.target.value },
                              }))
                            }
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                          />
                        </div>

                        <div className="sm:col-span-2 text-[11px] text-slate-400 font-mono tabular-nums flex flex-wrap gap-x-2">
                          <span>
                            {img.width}×{img.height}px
                          </span>
                          <span>·</span>
                          <span>{Math.round(img.sizeInBytes / 1024)} KB</span>
                          {img.isCover && (
                            <>
                              <span>·</span>
                              <span className="font-sans font-bold text-[#B45309]">صورة الغلاف الحالية</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveImageMeta(img.id)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                        >
                          حفظ الوصف
                        </button>

                        {!img.isCover && (
                          <button
                            type="button"
                            onClick={() => handleSetCover(img.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded cursor-pointer"
                            title="تعيين كغلاف"
                          >
                            <Star className="w-3.5 h-3.5" />
                            <span>غلاف</span>
                          </button>
                        )}

                        <input
                          ref={(el) => {
                            replaceInputRefs.current[img.id] = el;
                          }}
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          onChange={(e) => handleReplaceFile(img.id, e)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => replaceInputRefs.current[img.id]?.click()}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded cursor-pointer"
                          title="استبدال ملف الصورة"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>استبدال</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="حذف الصورة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    );
  }

  // ---- LIST VIEW ----
  return (
    <div className="space-y-6">
      <div className="space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-[#B45309]">معرض الأعمال</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">إدارة المشاريع</h1>
            <p className="text-sm leading-6 text-slate-600">أضف مشاريع جديدة، حدّث صور التنفيذ، وتحكّم بما يظهر للزوار.</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B45309] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
          >
            <Plus className="w-4 h-4" />
            <span>مشروع جديد</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 sm:p-4 xl:grid-cols-5">
          <div className="relative min-w-0 sm:col-span-2 xl:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="بحث بالعنوان أو العميل..."
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-9 pl-3 text-sm transition focus-visible:border-[#D97706] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D97706]/15"
            />
          </div>

          <select
            value={filterCategoryId ?? ''}
            onChange={(e) => {
              setFilterCategoryId(e.target.value ? Number(e.target.value) : null);
              setPage(1);
            }}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">كل التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as ProjectStatus | '');
              setPage(1);
            }}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">كل الحالات</option>
            <option value="Completed">{PROJECT_STATUS_AR.Completed}</option>
            <option value="InProgress">{PROJECT_STATUS_AR.InProgress}</option>
            <option value="Planned">{PROJECT_STATUS_AR.Planned}</option>
          </select>

          <select
            value={filterPublished === '' ? '' : String(filterPublished)}
            onChange={(e) => {
              const v = e.target.value;
              setFilterPublished(v === '' ? '' : v === 'true');
              setPage(1);
            }}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">النشر: الكل</option>
            <option value="true">منشور</option>
            <option value="false">مسودة</option>
          </select>
        </div>

      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loadingList ? (
          <div className="p-10 text-center text-sm text-slate-500">جاري تحميل المشاريع...</div>
        ) : !listData || listData.items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-800">لا توجد مشاريع مطابقة.</p>
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#D97706] rounded-md cursor-pointer"
            >
              إضافة أول مشروع
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-3 lg:hidden">
              {listData.items.map((proj) => (
                <article key={proj.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                      <ImageWithFallback
                        src={proj.coverImage?.thumbnailUrl}
                        alt={proj.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-2 text-sm font-bold leading-6 text-slate-900">{proj.title}</h2>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {proj.category.name} · {proj.city || 'مدينة غير محددة'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                          {PROJECT_STATUS_AR[proj.status]}
                        </span>
                        <span className="text-slate-500">{proj.imageCount} صورة</span>
                        {proj.isFeatured && (
                          <span className="font-semibold text-[#B45309]">مميز</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => openEdit(proj.id)}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      تعديل وصور
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(proj)}
                      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                        proj.isPublished
                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {proj.isPublished ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {proj.isPublished ? 'منشور' : 'مسودة'}
                    </button>
                  </div>
                  {deleteConfirmId === proj.id ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-red-50 p-2 text-xs">
                      <span className="text-red-800">تأكيد حذف المشروع؟</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSoftDelete(proj.id)}
                          className="min-h-9 rounded-lg bg-red-600 px-3 font-semibold text-white"
                        >
                          حذف
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="min-h-9 rounded-lg bg-white px-3 font-semibold text-slate-700"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(proj.id)}
                      aria-label={`حذف المشروع ${proj.title}`}
                      className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف المشروع
                    </button>
                  )}
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">المشروع</th>
                  <th className="py-3 px-4 font-semibold">التصنيف / العميل</th>
                  <th className="py-3 px-4 font-semibold">الحالة</th>
                  <th className="py-3 px-4 font-semibold">الصور</th>
                  <th className="py-3 px-4 font-semibold">النشر</th>
                  <th className="py-3 px-4 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listData.items.map((proj) => (
                  <tr key={proj.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-11 rounded overflow-hidden bg-slate-900 shrink-0 border border-slate-200">
                          <ImageWithFallback
                            src={proj.coverImage?.thumbnailUrl}
                            alt={proj.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 line-clamp-1">{proj.title}</div>
                          <div className="text-xs text-slate-500">
                            {proj.city || '—'}
                            {proj.isFeatured ? ' · مميز بالرئيسية' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-semibold text-slate-800">{proj.category.name}</div>
                      <div className="text-slate-500">{proj.clientName || 'عميل غير محدد'}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {PROJECT_STATUS_AR[proj.status]}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-700">
                      {proj.imageCount}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(proj)}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                          proj.isPublished ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {proj.isPublished ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                        <span>{proj.isPublished ? 'منشور' : 'مسودة'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(proj.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل والصور</span>
                        </button>

                        {deleteConfirmId === proj.id ? (
                          <div className="flex items-center gap-1 text-xs">
                            <button
                              type="button"
                              onClick={() => handleSoftDelete(proj.id)}
                              className="px-2 py-1 bg-red-600 text-white rounded cursor-pointer"
                            >
                              تأكيد
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 rounded cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(proj.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="حذف ناعم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
