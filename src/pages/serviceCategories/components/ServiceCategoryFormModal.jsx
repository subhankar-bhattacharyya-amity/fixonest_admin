import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  ImagePlus,
  Info,
  Loader2,
  Lock,
  PencilLine,
  Plus,
  Save,
  Tag,
  Undo2,
  UploadCloud,
} from 'lucide-react';
import {
  SERVICE_CATEGORY_NAME_MAX,
  SERVICE_CATEGORY_DESCRIPTION_MAX,
  SERVICE_CATEGORY_ICON_TYPES,
  SERVICE_CATEGORY_ICON_MAX_BYTES,
  serviceCategoryValidationSchema,
  superAdminServiceCategoryValidationSchema,
  buildServiceCategoryIconUrl,
  createServiceCategory,
  updateServiceCategory,
} from '@/features/serviceCategory/index.js';
import { getVerticalVisual } from '@/features/vertical/index.js';
import { Modal } from '@/components/common/modal/index.js';
import ServiceCategoryIcon from './ServiceCategoryIcon.jsx';

const TEXT_FIELDS = ['name', 'description'];
const ICON_MAX_MB = SERVICE_CATEGORY_ICON_MAX_BYTES / (1024 * 1024);

const fieldClass = (hasError) =>
  `input-field bg-slate-50 ${hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''}`;

// One modal for "Add Category" (no `category`) and "Edit Category", for both
// roles.
//   - Super Admin: also picks the vertical the category belongs to.
//   - Admin: the category always belongs to their own vertical (`adminVertical`),
//     shown locked - the backend enforces it.
// Edit pre-fills from the listing row and sends only what actually changed.
// There is no status field: a new category is created Active (the backend's
// default), and status is changed with the listing's activate/deactivate action.
// The icon is an optional image, uploaded with the same request.
export default function ServiceCategoryFormModal({
  category = null,
  isSuperAdmin,
  verticals = [],
  adminVertical,
  existingCategories = [],
  onClose,
  onSaved,
}) {
  const dispatch = useDispatch();
  const isEdit = Boolean(category);
  const fileInputRef = useRef(null);

  // The newly picked icon: null | { file, previewUrl }.
  const [icon, setIcon] = useState(null);
  const [iconError, setIconError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const defaultValues = useMemo(
    () => ({
      name: category?.name ?? '',
      description: category?.description ?? '',
      ...(isSuperAdmin ? { vertical_id: category?.vertical_data?._id ?? category?.vertical_id ?? '' } : {}),
    }),
    [category, isSuperAdmin],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty, isSubmitted },
  } = useForm({
    resolver: zodResolver(isSuperAdmin ? superAdminServiceCategoryValidationSchema : serviceCategoryValidationSchema),
    defaultValues,
  });

  const [name = '', description = '', verticalId] = useWatch({
    control,
    name: ['name', 'description', 'vertical_id'],
  });

  // Free the preview's object URL when it's replaced or the modal closes.
  useEffect(() => {
    if (!icon) return undefined;
    return () => URL.revokeObjectURL(icon.previewUrl);
  }, [icon]);

  const pickIcon = (file) => {
    if (!file) return;
    if (!SERVICE_CATEGORY_ICON_TYPES.includes(file.type)) {
      setIconError('Choose a PNG, JPG or WEBP image.');
      return;
    }
    if (file.size > SERVICE_CATEGORY_ICON_MAX_BYTES) {
      setIconError(`That image is too large - the limit is ${ICON_MAX_MB} MB.`);
      return;
    }
    setIconError('');
    setIcon({ file, previewUrl: URL.createObjectURL(file) });
  };

  const handleFileChange = (event) => {
    pickIcon(event.target.files?.[0]);
    // Let the same file be picked again after it was removed.
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isSubmitting) pickIcon(event.dataTransfer.files?.[0]);
  };

  const clearIcon = () => {
    setIcon(null);
    setIconError('');
  };

  const onSubmit = async (values) => {
    try {
      let result;
      if (isEdit) {
        const changes = Object.fromEntries(
          TEXT_FIELDS.filter((field) => values[field] !== defaultValues[field]).map((field) => [field, values[field]]),
        );
        if (isSuperAdmin && values.vertical_id !== defaultValues.vertical_id) changes.vertical_id = values.vertical_id;
        result = await dispatch(
          updateServiceCategory({ id: category._id, payload: { ...changes, iconFile: icon?.file } }),
        ).unwrap();
      } else {
        result = await dispatch(
          createServiceCategory({
            name: values.name,
            // An empty description is simply left out.
            description: values.description || undefined,
            vertical_id: isSuperAdmin ? values.vertical_id : undefined,
            iconFile: icon?.file,
          }),
        ).unwrap();
      }
      toast.success(result.message);
      onSaved();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    }
  };

  const hasChanges = isDirty || Boolean(icon);
  const existingIconUrl = buildServiceCategoryIconUrl(category);
  const previewUrl = icon?.previewUrl ?? existingIconUrl;

  // Names are unique across the whole platform, case-insensitively. This is
  // only an early hint from the loaded list - the backend's 409 is the real check.
  const typedName = name.trim().toLowerCase();
  const duplicate =
    typedName && existingCategories.find((item) => item._id !== category?._id && item.name?.trim().toLowerCase() === typedName);

  const verticalChanged = isEdit && isSuperAdmin && defaultValues.vertical_id && verticalId !== defaultValues.vertical_id;

  return (
    <Modal
      title={isEdit ? 'Edit Service Category' : 'Add Service Category'}
      description={
        isEdit
          ? `Update ${category.name}'s details or icon.`
          : isSuperAdmin
            ? 'Create a category and choose the vertical it belongs to.'
            : `Create a category for ${adminVertical || 'your vertical'}.`
      }
      icon={isEdit ? PencilLine : Plus}
      size="lg"
      busy={isSubmitting}
      onClose={onClose}
      footer={
        <>
          {isEdit && !hasChanges && (
            <span className="sm:mr-auto self-center text-xs text-slate-400 text-center sm:text-left">
              Change a field to enable saving
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="service-category-form"
            disabled={isSubmitting || (isEdit && !hasChanges)}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : isEdit ? <Save size={18} /> : <Plus size={18} />}
            {isEdit ? 'Save Changes' : 'Create Category'}
          </button>
        </>
      }
    >
      <form id="service-category-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* Details */}
        <fieldset className="space-y-4">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Category details</legend>

          {/* Icon - click or drop an image */}
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col gap-4 rounded-2xl border border-dashed p-4 transition-colors sm:flex-row sm:items-center ${
              isDragging ? 'border-teal-400 bg-teal-50/60' : iconError ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="relative mx-auto sm:mx-0 shrink-0">
              {previewUrl ? (
                <ServiceCategoryIcon src={previewUrl} className="w-20 h-20 rounded-2xl shadow-sm" glyphSize={30} />
              ) : (
                <span className="w-20 h-20 rounded-2xl bg-white ring-1 ring-slate-200 text-slate-300 flex items-center justify-center">
                  <ImagePlus size={30} />
                </span>
              )}
              {icon && (
                <span className="absolute -top-1.5 -right-1.5 rounded-full bg-teal-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ring-2 ring-white">
                  New
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-sm font-medium text-gray-700">
                Category icon <span className="font-normal text-slate-400">(optional)</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-400 truncate">
                {icon ? icon.file.name : `Drop an image here, or browse. PNG, JPG or WEBP up to ${ICON_MAX_MB} MB.`}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-50"
                >
                  <UploadCloud size={14} />
                  {previewUrl ? 'Replace image' : 'Upload image'}
                </button>
                {icon && (
                  <button
                    type="button"
                    onClick={clearIcon}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 disabled:opacity-50"
                  >
                    <Undo2 size={14} />
                    {existingIconUrl ? 'Keep current' : 'Remove'}
                  </button>
                )}
              </div>
              {iconError && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-500">
                  {iconError}
                </p>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={SERVICE_CATEGORY_ICON_TYPES.join(',')}
              onChange={handleFileChange}
              aria-label="Category icon"
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="service-category-name" className="text-sm font-medium text-gray-700">
              Category name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="service-category-name"
                type="text"
                maxLength={SERVICE_CATEGORY_NAME_MAX}
                autoComplete="off"
                autoFocus={!isEdit}
                placeholder="e.g. AC Repair & Service"
                aria-invalid={Boolean(errors.name || duplicate)}
                className={`${fieldClass(errors.name || duplicate)} pl-10`}
                {...register('name')}
              />
            </div>
            {errors.name ? (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.name.message}
              </p>
            ) : duplicate ? (
              <p role="alert" className="text-xs font-medium text-rose-500">
                A category named “{duplicate.name}” already exists.
              </p>
            ) : (
              <p className="text-xs text-slate-400">Shown to customers. Must be unique across all categories.</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="service-category-description" className="text-sm font-medium text-gray-700">
                Description <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <span
                className={`text-[11px] tabular-nums ${
                  description.length > SERVICE_CATEGORY_DESCRIPTION_MAX ? 'font-semibold text-rose-500' : 'text-slate-400'
                }`}
              >
                {description.length}/{SERVICE_CATEGORY_DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="service-category-description"
              rows={3}
              placeholder="A short line about the services in this category."
              aria-invalid={Boolean(errors.description)}
              className={`${fieldClass(errors.description)} resize-none`}
              {...register('description')}
            />
            {errors.description && (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.description.message}
              </p>
            )}
          </div>
        </fieldset>

        {/* Vertical */}
        {isSuperAdmin ? (
          <fieldset>
            <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Vertical <span className="text-rose-500">*</span>
            </legend>
            <p className="mb-3 text-xs text-slate-400">
              The vertical this category belongs to. Its Admin will be able to manage the category.
            </p>

            {verticals.length === 0 ? (
              <Callout tone="slate" icon={Info}>
                No verticals exist yet. Create one under Vertical Management first.
              </Callout>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Vertical">
                {verticals.map((vertical) => (
                  <VerticalRadio
                    key={vertical._id}
                    vertical={vertical}
                    checked={verticalId === vertical._id}
                    onSelect={() =>
                      setValue('vertical_id', vertical._id, { shouldDirty: true, shouldValidate: isSubmitted })
                    }
                  />
                ))}
              </div>
            )}

            {errors.vertical_id && (
              <p role="alert" className="mt-2 text-xs font-medium text-rose-500">
                {errors.vertical_id.message}
              </p>
            )}

            {verticalChanged && !errors.vertical_id && (
              <div className="mt-3">
                <Callout tone="amber" icon={AlertTriangle}>
                  The Admin of the previous vertical will no longer see or manage this category.
                </Callout>
              </div>
            )}
          </fieldset>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
            <span className="w-9 h-9 shrink-0 rounded-lg bg-white ring-1 ring-slate-200 text-slate-400 flex items-center justify-center">
              <Lock size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Vertical</p>
              <p className="text-sm font-semibold text-slate-700 truncate">{adminVertical || 'Your vertical'}</p>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

// A single-select vertical card (radio semantics - a category has one vertical).
function VerticalRadio({ vertical, checked, onSelect }) {
  const { icon: Icon, tone } = getVerticalVisual(vertical.name);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
        checked ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20' : 'border-slate-200 bg-white hover:border-teal-300'
      }`}
    >
      <span className={`w-9 h-9 shrink-0 rounded-lg ring-1 flex items-center justify-center ${tone}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800 truncate">{vertical.display_name || vertical.name}</span>
        <span className="block text-xs font-mono text-slate-400 truncate">{vertical.name}</span>
      </span>
      <span
        className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center text-white transition-colors ${
          checked ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
        }`}
      >
        <Check size={12} strokeWidth={3} />
      </span>
    </button>
  );
}

const CALLOUT_TONES = {
  amber: 'bg-amber-50 text-amber-800',
  slate: 'bg-slate-50 text-slate-600',
};

function Callout({ tone, icon: Icon, children }) {
  return (
    <p className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${CALLOUT_TONES[tone]}`}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}
