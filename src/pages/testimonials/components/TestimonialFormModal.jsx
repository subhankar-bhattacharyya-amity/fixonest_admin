import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  Globe,
  ImagePlus,
  Lightbulb,
  Loader2,
  MapPin,
  PencilLine,
  Plus,
  Quote,
  Save,
  Star,
  Trash2,
  Undo2,
  UploadCloud,
} from 'lucide-react';
import {
  TESTIMONIAL_STATUS,
  TESTIMONIAL_NAME_MAX,
  TESTIMONIAL_LOCATION_MAX,
  TESTIMONIAL_SERVICE_MAX,
  TESTIMONIAL_QUOTE_MAX,
  TESTIMONIAL_AVATAR_TYPES,
  TESTIMONIAL_AVATAR_MAX_BYTES,
  RATING_LABELS,
  testimonialValidationSchema,
  buildTestimonialAvatarUrl,
  createTestimonial,
  updateTestimonial,
} from '@/features/testimonial/index.js';
import { Modal } from '@/components/common/modal/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import RatingStars from './RatingStars.jsx';

const AVATAR_MAX_MB = TESTIMONIAL_AVATAR_MAX_BYTES / (1024 * 1024);
const TEXT_FIELDS = ['name', 'service', 'location', 'rating', 'quote'];

const fieldClass = (hasError) =>
  `input-field bg-slate-50 ${hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''}`;

// One modal for "Add Testimonial" (no `testimonial`) and "Edit Testimonial".
// A new testimonial goes to the end of the carousel (`nextOrder`); its
// position is changed afterwards with the listing's arrows. Edit pre-fills
// from the listing card and sends only what actually changed. A live preview
// shows the card exactly as the website will.
export default function TestimonialFormModal({ testimonial = null, nextOrder, onClose, onSaved }) {
  const dispatch = useDispatch();
  const isEdit = Boolean(testimonial);
  const fileInputRef = useRef(null);

  // A newly picked photo ({ file, previewUrl }), and whether the current one
  // should be removed on save.
  const [photo, setPhoto] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const defaultValues = useMemo(
    () => ({
      name: testimonial?.name ?? '',
      service: testimonial?.service ?? '',
      location: testimonial?.location ?? '',
      rating: testimonial?.rating ?? 5,
      quote: testimonial?.quote ?? '',
      isActive: testimonial ? testimonial.status !== TESTIMONIAL_STATUS.INACTIVE : true,
    }),
    [testimonial],
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(testimonialValidationSchema), defaultValues });

  const [name = '', service = '', location = '', rating = 0, quote = '', isActive] = useWatch({
    control,
    name: ['name', 'service', 'location', 'rating', 'quote', 'isActive'],
  });

  // Free the preview's object URL when it's replaced or the modal closes.
  useEffect(() => {
    if (!photo) return undefined;
    return () => URL.revokeObjectURL(photo.previewUrl);
  }, [photo]);

  const pickPhoto = (file) => {
    if (!file) return;
    if (!TESTIMONIAL_AVATAR_TYPES.includes(file.type)) {
      setPhotoError('Choose a PNG, JPG or WEBP image.');
      return;
    }
    if (file.size > TESTIMONIAL_AVATAR_MAX_BYTES) {
      setPhotoError(`That image is too large - the limit is ${AVATAR_MAX_MB} MB.`);
      return;
    }
    setPhotoError('');
    setRemovePhoto(false);
    setPhoto({ file, previewUrl: URL.createObjectURL(file) });
  };

  const handleFileChange = (event) => {
    pickPhoto(event.target.files?.[0]);
    // Let the same file be picked again after it was removed.
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (!isSubmitting) pickPhoto(event.dataTransfer.files?.[0]);
  };

  const existingPhotoUrl = buildTestimonialAvatarUrl(testimonial?.avatar);
  const photoUrl = photo?.previewUrl ?? (removePhoto ? null : existingPhotoUrl);
  const hasChanges = isDirty || Boolean(photo) || removePhoto;

  const onSubmit = async (values) => {
    const status = values.isActive ? TESTIMONIAL_STATUS.ACTIVE : TESTIMONIAL_STATUS.INACTIVE;
    try {
      let result;
      if (isEdit) {
        const changes = Object.fromEntries(
          TEXT_FIELDS.filter((field) => values[field] !== defaultValues[field]).map((field) => [field, values[field]]),
        );
        if (values.isActive !== defaultValues.isActive) changes.status = status;
        if (photo) changes.avatarFile = photo.file;
        else if (removePhoto) changes.avatar = '';
        result = await dispatch(updateTestimonial({ id: testimonial._id, payload: changes })).unwrap();
      } else {
        result = await dispatch(
          createTestimonial({
            name: values.name,
            rating: values.rating,
            quote: values.quote,
            // Empty optional fields are simply left out.
            service: values.service || undefined,
            location: values.location || undefined,
            order: nextOrder,
            status,
            avatarFile: photo?.file,
          }),
        ).unwrap();
      }
      toast.success(result.message);
      onSaved();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Testimonial' : 'Add Testimonial'}
      description={
        isEdit ? `Update ${testimonial.name}'s review on the Home page.` : 'Add a customer review to the Home page carousel.'
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
            form="testimonial-form"
            disabled={isSubmitting || (isEdit && !hasChanges)}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : isEdit ? <Save size={18} /> : <Plus size={18} />}
            {isEdit ? 'Save Changes' : 'Add Testimonial'}
          </button>
        </>
      }
    >
      <form id="testimonial-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* Customer */}
        <fieldset className="space-y-4">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Customer</legend>

          {/* Photo - click or drop an image */}
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col gap-4 rounded-2xl border border-dashed p-4 transition-colors sm:flex-row sm:items-center ${
              isDragging
                ? 'border-teal-400 bg-teal-50/60'
                : photoError
                  ? 'border-rose-300 bg-rose-50/30'
                  : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="relative mx-auto sm:mx-0 shrink-0">
              {photoUrl ? (
                <Avatar
                  src={photoUrl}
                  name={name}
                  alt={name ? `${name}'s photo` : 'Customer photo'}
                  className="h-20 w-20 text-xl ring-4 ring-white shadow-md shadow-slate-300/60"
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-slate-300 ring-1 ring-slate-200">
                  <ImagePlus size={28} />
                </span>
              )}
              {photo && (
                <span className="absolute -top-1 -right-1 rounded-full bg-teal-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ring-2 ring-white">
                  New
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-sm font-medium text-gray-700">
                Customer photo <span className="font-normal text-slate-400">(optional)</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-400 truncate">
                {photo
                  ? photo.file.name
                  : removePhoto
                    ? 'The current photo will be removed - initials show instead.'
                    : `Drop an image here, or browse. PNG, JPG or WEBP up to ${AVATAR_MAX_MB} MB.`}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-50"
                >
                  <UploadCloud size={14} />
                  {photoUrl ? 'Replace photo' : 'Upload photo'}
                </button>
                {photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 disabled:opacity-50"
                  >
                    <Undo2 size={14} />
                    {existingPhotoUrl && !removePhoto ? 'Keep current' : 'Remove'}
                  </button>
                )}
                {!photo && existingPhotoUrl && !removePhoto && (
                  <button
                    type="button"
                    onClick={() => setRemovePhoto(true)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Remove photo
                  </button>
                )}
                {!photo && removePhoto && (
                  <button
                    type="button"
                    onClick={() => setRemovePhoto(false)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 disabled:opacity-50"
                  >
                    <Undo2 size={14} />
                    Keep current
                  </button>
                )}
              </div>
              {photoError && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-500">
                  {photoError}
                </p>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={TESTIMONIAL_AVATAR_TYPES.join(',')}
              onChange={handleFileChange}
              aria-label="Customer photo"
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="testimonial-name" className="text-sm font-medium text-gray-700">
              Customer name <span className="text-rose-500">*</span>
            </label>
            <input
              id="testimonial-name"
              type="text"
              autoFocus={!isEdit}
              maxLength={TESTIMONIAL_NAME_MAX}
              placeholder="e.g. Meera Pillai"
              aria-invalid={Boolean(errors.name)}
              className={fieldClass(errors.name)}
              {...register('name')}
            />
            {errors.name && (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="testimonial-service" className="text-sm font-medium text-gray-700">
                Service booked <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="testimonial-service"
                type="text"
                maxLength={TESTIMONIAL_SERVICE_MAX}
                placeholder="e.g. AC Repair & Service"
                aria-invalid={Boolean(errors.service)}
                className={fieldClass(errors.service)}
                {...register('service')}
              />
              {errors.service && (
                <p role="alert" className="text-xs font-medium text-rose-500">
                  {errors.service.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="testimonial-location" className="text-sm font-medium text-gray-700">
                City <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <div className="relative">
                <MapPin
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="testimonial-location"
                  type="text"
                  maxLength={TESTIMONIAL_LOCATION_MAX}
                  placeholder="e.g. Kochi"
                  aria-invalid={Boolean(errors.location)}
                  className={`${fieldClass(errors.location)} pl-9`}
                  {...register('location')}
                />
              </div>
              {errors.location && (
                <p role="alert" className="text-xs font-medium text-rose-500">
                  {errors.location.message}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Review */}
        <fieldset className="space-y-4">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Review</legend>

          <Controller
            name="rating"
            control={control}
            render={({ field }) => (
              <StarPicker value={field.value} onChange={field.onChange} disabled={isSubmitting} error={errors.rating?.message} />
            )}
          />

          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="testimonial-quote" className="text-sm font-medium text-gray-700">
                What the customer said <span className="text-rose-500">*</span>
              </label>
              <CharCount value={quote} max={TESTIMONIAL_QUOTE_MAX} />
            </div>
            <textarea
              id="testimonial-quote"
              rows={4}
              placeholder="e.g. The provider explained exactly what was wrong before fixing it..."
              aria-invalid={Boolean(errors.quote)}
              className={`${fieldClass(errors.quote)} resize-y min-h-24 leading-relaxed`}
              {...register('quote')}
            />
            {errors.quote ? (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.quote.message}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Lightbulb size={12} className="shrink-0 text-amber-400" />
                Two to four sentences fit the website's card best. No need to add quote marks.
              </p>
            )}
          </div>

          {/* Visibility */}
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                disabled={isSubmitting}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left ring-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-60 ${
                  field.value ? 'bg-emerald-50/60 ring-emerald-100' : 'bg-slate-50 ring-slate-200'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    field.value ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                  }`}
                  aria-hidden="true"
                >
                  {field.value ? <Eye size={17} /> : <EyeOff size={17} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-700">
                    {field.value ? 'Live on the website' : 'Hidden from the website'}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {field.value
                      ? 'Customers see this review in the Home page carousel as soon as you save.'
                      : 'Saved here as a draft. Customers won’t see it until you turn this on.'}
                  </span>
                </span>
                <span
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${field.value ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  aria-hidden="true"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      field.value ? 'translate-x-5' : ''
                    }`}
                  />
                </span>
              </button>
            )}
          />
        </fieldset>

        {/* Live preview - shaped like the customer site's testimonial card */}
        <div className="rounded-2xl border border-slate-100 bg-linear-to-br from-slate-50 to-teal-50/40 p-3.5 sm:p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Globe size={12} />
            Website preview
            {!isActive && <span className="ml-auto normal-case tracking-normal font-medium text-slate-400">Hidden</span>}
          </p>
          <div
            className={`mx-auto max-w-sm rounded-2xl bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-slate-100 transition-opacity ${
              isActive ? '' : 'opacity-60'
            }`}
          >
            <Quote size={28} className="text-teal-200" aria-hidden="true" />
            <RatingStars rating={rating} size={14} className="mt-2" />
            <p className={`mt-3 text-sm leading-relaxed ${quote.trim() ? 'text-slate-600' : 'text-slate-400'}`}>
              “{quote.trim() || 'The customer’s review appears here, just as it will on the Home page.'}”
            </p>
            <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
              <Avatar src={photoUrl} name={name || '?'} className="h-11 w-11 text-sm ring-2 ring-white shadow-sm" />
              <div className="min-w-0">
                <p className={`truncate text-sm font-semibold ${name.trim() ? 'text-slate-800' : 'text-slate-400'}`}>
                  {name.trim() || 'Customer name'}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {[service.trim(), location.trim()].filter(Boolean).join(' · ') || 'Service · City'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// Five big tappable stars; hovering previews a rating before it's picked.
// Arrow keys change it too, as a radio group.
function StarPicker({ value, onChange, disabled, error }) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(Math.max(1, (value || 1) - 1));
    }
  };

  return (
    <div className="space-y-1.5">
      <p id="testimonial-rating-label" className="text-sm font-medium text-gray-700">
        Rating <span className="text-rose-500">*</span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="radiogroup"
          aria-labelledby="testimonial-rating-label"
          onKeyDown={handleKeyDown}
          onMouseLeave={() => setHovered(0)}
          className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200"
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star > 1 ? 's' : ''} - ${RATING_LABELS[star]}`}
              tabIndex={value === star || (!value && star === 1) ? 0 : -1}
              disabled={disabled}
              onMouseEnter={() => setHovered(star)}
              onClick={() => onChange(star)}
              className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:opacity-50"
            >
              <Star
                size={26}
                className={`transition-colors ${star <= shown ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
              />
            </button>
          ))}
        </div>
        {shown > 0 && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-500/20">
            {shown}/5 · {RATING_LABELS[shown]}
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-rose-500">
          {error}
        </p>
      )}
    </div>
  );
}

function CharCount({ value, max }) {
  const length = value.length;
  const tone = length > max ? 'font-semibold text-rose-500' : length > max * 0.9 ? 'text-amber-500' : 'text-slate-400';
  return (
    <span className={`text-[11px] tabular-nums ${tone}`}>
      {length}/{max}
    </span>
  );
}
