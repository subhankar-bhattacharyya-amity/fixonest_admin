import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { AlertTriangle, KeyRound, Loader2, PencilLine, Plus, Save, Sparkles, Type } from 'lucide-react';
import {
  VERTICAL_KEY_MAX,
  getVerticalVisual,
  toVerticalKey,
  verticalValidationSchema,
  fetchVerticalById,
  createVertical,
  updateVertical,
} from '@/features/vertical/index.js';
import { Modal } from '@/components/common/modal/index.js';

const EMPTY_VALUES = { display_name: '', name: '' };

const inputClass = (hasError) =>
  `input-field bg-slate-50 pl-10 ${hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''}`;

// One modal for both "Add Vertical" (no verticalId) and "Edit Vertical". In
// edit mode it loads that vertical's latest details from the API
// (GET /verticals/:id) and pre-fills the form. While adding, the key follows
// the display name until the user edits the key themselves. `existingVerticals`
// (the loaded list) powers an early "key already used" hint - the backend's
// 409 remains the real check.
export default function VerticalFormModal({ verticalId, existingVerticals = [], onClose, onSaved }) {
  const dispatch = useDispatch();
  const isEdit = Boolean(verticalId);
  const [details, setDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(isEdit);
  // Adding: the key mirrors the display name until typed into directly.
  const [isKeyLinked, setIsKeyLinked] = useState(!isEdit);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty, isSubmitted },
  } = useForm({
    resolver: zodResolver(verticalValidationSchema),
    defaultValues: EMPTY_VALUES,
  });

  const keyValue = useWatch({ control, name: 'name' });
  const displayName = useWatch({ control, name: 'display_name' });

  useEffect(() => {
    if (!isEdit) return;
    let isActive = true;
    dispatch(fetchVerticalById(verticalId))
      .unwrap()
      .then((result) => {
        if (!isActive) return;
        const vertical = result.data;
        setDetails(vertical);
        reset({ display_name: vertical.display_name ?? '', name: vertical.name });
        setIsLoadingDetails(false);
      })
      .catch(() => {
        // Already toasted by httpClient - nothing to edit, so close.
        if (isActive) onClose();
      });
    return () => {
      isActive = false;
    };
  }, [dispatch, isEdit, verticalId, reset, onClose]);

  const displayNameField = register('display_name', {
    onChange: (event) => {
      if (isKeyLinked) {
        setValue('name', toVerticalKey(event.target.value), { shouldDirty: true, shouldValidate: isSubmitted });
      }
    },
  });
  const keyField = register('name', {
    onChange: () => setIsKeyLinked(false),
    // Tidy what was typed ("Beauty Care" -> "beauty_care") when leaving the field.
    onBlur: (event) => {
      const tidy = toVerticalKey(event.target.value);
      if (tidy !== event.target.value) setValue('name', tidy, { shouldDirty: true, shouldValidate: true });
    },
  });

  const onSubmit = async (values) => {
    try {
      const result = isEdit
        ? await dispatch(updateVertical({ id: verticalId, payload: values })).unwrap()
        : await dispatch(createVertical(values)).unwrap();
      toast.success(result.message);
      onSaved();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    }
  };

  const duplicate = existingVerticals.find((vertical) => vertical.name === keyValue && vertical._id !== verticalId);
  const keyChanged = isEdit && details && keyValue !== details.name;
  const { icon: PreviewIcon, tone } = getVerticalVisual(keyValue);

  return (
    <Modal
      title={isEdit ? 'Edit Vertical' : 'Add New Vertical'}
      description={isEdit ? "Update this vertical's name or key." : 'Create a new service vertical for Fixonest.'}
      icon={isEdit ? PencilLine : Plus}
      busy={isSubmitting}
      onClose={onClose}
      footer={
        <>
          {isEdit && !isLoadingDetails && !isDirty && (
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
            form="vertical-form"
            disabled={isSubmitting || isLoadingDetails || (isEdit && !isDirty)}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : isEdit ? <Save size={18} /> : <Plus size={18} />}
            {isEdit ? 'Save Changes' : 'Create Vertical'}
          </button>
        </>
      }
    >
      {isLoadingDetails ? (
        <FormSkeleton />
      ) : (
        <form id="vertical-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div className="space-y-1">
            <label htmlFor="display_name" className="text-sm font-medium text-gray-700">
              Display name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Type size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="display_name"
                type="text"
                maxLength={120}
                autoComplete="off"
                autoFocus={!isEdit}
                placeholder="e.g. Beauty & Wellness"
                aria-invalid={Boolean(errors.display_name)}
                className={inputClass(errors.display_name)}
                {...displayNameField}
              />
            </div>
            {errors.display_name ? (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.display_name.message}
              </p>
            ) : (
              <p className="text-xs text-slate-400">What admins and customers see.</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="vertical_key" className="text-sm font-medium text-gray-700">
                Vertical key <span className="text-rose-500">*</span>
              </label>
              {isKeyLinked && !isEdit && (
                <span className="text-[11px] font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
                  Auto from name
                </span>
              )}
            </div>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="vertical_key"
                type="text"
                maxLength={VERTICAL_KEY_MAX}
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. beauty_wellness"
                aria-invalid={Boolean(errors.name || duplicate)}
                className={`${inputClass(errors.name || duplicate)} font-mono text-sm`}
                {...keyField}
              />
            </div>
            {errors.name ? (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.name.message}
              </p>
            ) : duplicate ? (
              <p role="alert" className="text-xs font-medium text-rose-500">
                “{duplicate.display_name || duplicate.name}” already uses this key.
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Unique system identifier - lowercase letters, numbers and underscores.
              </p>
            )}
            {keyChanged && !errors.name && !duplicate && (
              <p className="flex items-start gap-1.5 mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Changing the key can affect anything that looks this vertical up by its key.
              </p>
            )}
          </div>

          {(displayName?.trim() || keyValue) && (
            <div className="rounded-xl border border-dashed border-slate-200 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
                <Sparkles size={12} /> Preview
              </p>
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 shrink-0 rounded-xl ring-1 flex items-center justify-center ${tone}`}>
                  <PreviewIcon size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {displayName?.trim() || 'Untitled vertical'}
                  </p>
                  <p className="text-xs font-mono text-slate-400 truncate">{keyValue || '—'}</p>
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5 animate-pulse" aria-label="Loading vertical details">
      {[0, 1].map((field) => (
        <div key={field} className="space-y-2">
          <div className="h-4 w-28 rounded bg-slate-100" />
          <div className="h-10 rounded-lg bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
