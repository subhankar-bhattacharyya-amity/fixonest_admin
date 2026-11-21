import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  Clock3,
  FileText,
  ImageIcon,
  IndianRupee,
  Info,
  ListChecks,
  MessageSquareText,
  Loader2,
  LogOut,
  Plus,
  Save,
  Star,
  Tag,
  Wand2,
} from 'lucide-react';
import {
  SERVICE_STATUS,
  SERVICE_FEATURED_LIMIT,
  SERVICE_NAME_MAX,
  SERVICE_DESCRIPTION_MAX,
  SERVICE_OVERVIEW_MAX,
  SERVICE_DURATION_LABEL_MAX,
  serviceValidationSchema,
  buildServiceImageUrl,
  getServicePricing,
  formatServicePrice,
  formatServiceDuration,
  createService,
  updateService,
} from '@/features/service/index.js';
import { ConfirmDialog } from '@/components/common/modal/index.js';
import { getServiceReviewsPath, getServicesPath } from '@/routes/constants.js';
import { ServiceCoverField, ServiceGalleryField } from './ServiceMediaFields.jsx';
import ServiceListField from './ServiceListField.jsx';
import ServiceSkillsField from './ServiceSkillsField.jsx';
import ServicePreviewCard from './ServicePreviewCard.jsx';

const SCALAR_FIELDS = [
  'name',
  'categoryId',
  'description',
  'status',
  'isFeatured',
  'price',
  'discountPrice',
  'durationInMinutes',
  'durationLabel',
  'overview',
];
const LIST_FIELDS = ['whatYouGet', 'packageBenefits', 'skills'];

// The form's sections, for the jump bar and its "needs attention" dots.
const SECTIONS = [
  { id: 'basics', label: 'Basics', icon: Tag, fields: ['name', 'categoryId', 'description'] },
  { id: 'pricing', label: 'Pricing', icon: IndianRupee, fields: ['price', 'discountPrice', 'durationInMinutes', 'durationLabel'] },
  { id: 'details', label: 'Details', icon: ListChecks, fields: ['overview', 'whatYouGet', 'packageBenefits', 'skills'] },
  { id: 'media', label: 'Media', icon: ImageIcon, fields: [] },
  { id: 'reviews', label: 'Reviews', icon: Star, fields: [] },
];

// One-click starters for the details lists - the lines the customer site has
// always shown, so a new service never starts from a blank page.
const WHAT_YOU_GET_SUGGESTIONS = [
  'Trained, background-verified professional',
  'All tools & consumables brought by the provider',
  'Post-service walkthrough & cleanup',
  '30-day service warranty on workmanship',
];
const BENEFIT_SUGGESTIONS = [
  'Quality service, guaranteed',
  'Free rescheduling up to 24 hours before',
  'Secure, cashless payments',
];
const QUICK_DISCOUNTS = [10, 15, 20, 25];

const sameList = (a = [], b = []) => a.length === b.length && a.every((item, index) => item === b[index]);

const fieldClass = (hasError) =>
  `input-field bg-slate-50 ${hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''}`;

// Number inputs: empty becomes NaN (reported as "required" by the schema).
const numberField = { valueAsNumber: true };

// The create/edit form behind ServiceEditorPage - "Add Service" when `service`
// is null, "Edit Service" otherwise. Five sections on the left (basics,
// pricing, details-page content, media, reviews), and a sticky side column
// with the visibility switches and a live preview of the customer card.
// Service and details fields are saved in one request (the backend splits
// them between Service and ServiceDetails); an edit sends only what changed,
// then applies the gallery's removals, uploads and new order.
export default function ServiceForm({ service = null, categories, categoriesReady, role, summary }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isEdit = Boolean(service);
  const listPath = getServicesPath(role);
  const [confirmLeave, setConfirmLeave] = useState(false);

  // Cover: a newly picked file, and whether the saved cover was taken off.
  const [coverFile, setCoverFile] = useState(null); // null | { file, previewUrl }
  const [coverRemoved, setCoverRemoved] = useState(false);

  // Gallery in display order: [{ id, url, isNew, file? }]. Saved images keep
  // their server id; new ones get a temporary id until they're uploaded.
  const initialGallery = useMemo(
    () =>
      (service?.images ?? []).map((image) => ({ id: image._id, url: buildServiceImageUrl(image.image_url), isNew: false })),
    [service],
  );
  const [gallery, setGallery] = useState(initialGallery);
  const [removedImageIds, setRemovedImageIds] = useState([]);

  // Every preview URL made here is freed when the form unmounts.
  const objectUrls = useRef([]);
  const makePreviewUrl = (file) => {
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    return url;
  };
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const defaultValues = useMemo(
    () => ({
      name: service?.name ?? '',
      categoryId: service?.categoryId ?? '',
      description: service?.description ?? '',
      status: service?.status ?? SERVICE_STATUS.ACTIVE,
      isFeatured: Boolean(service?.isFeatured),
      price: service ? Number(service.price) : undefined,
      discountPrice: Number(service?.discountPrice ?? 0),
      durationInMinutes: Number(service?.durationInMinutes ?? 0),
      durationLabel: service?.details?.durationLabel ?? '',
      overview: service?.details?.overview ?? '',
      whatYouGet: service?.details?.whatYouGet ?? [],
      packageBenefits: service?.details?.packageBenefits ?? [],
      skills: service?.details?.skills ?? [],
    }),
    [service],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty, isSubmitted },
  } = useForm({ resolver: zodResolver(serviceValidationSchema), defaultValues });

  const values = useWatch({ control });
  const write = (field, value) => setValue(field, value, { shouldDirty: true, shouldValidate: isSubmitted });

  // ----- Cover -----
  const savedCoverUrl = buildServiceImageUrl(service?.image_url);
  const coverPreviewUrl = coverFile?.previewUrl ?? (coverRemoved ? null : savedCoverUrl);
  const coverChanged = Boolean(coverFile) || coverRemoved;
  const pickCover = (file) => setCoverFile({ file, previewUrl: makePreviewUrl(file) });
  const removeCover = () => {
    setCoverFile(null);
    setCoverRemoved(Boolean(savedCoverUrl));
  };
  const restoreCover = () => {
    setCoverFile(null);
    setCoverRemoved(false);
  };

  // ----- Gallery -----
  const addGalleryFiles = (files) =>
    setGallery((current) => [
      ...current,
      ...files.map((file) => ({ id: crypto.randomUUID(), file, url: makePreviewUrl(file), isNew: true })),
    ]);
  const removeGalleryImage = (image) => {
    setGallery((current) => current.filter((item) => item.id !== image.id));
    if (!image.isNew) setRemovedImageIds((current) => [...current, image.id]);
  };
  const galleryChanged =
    removedImageIds.length > 0 ||
    gallery.some((image) => image.isNew) ||
    !sameList(
      gallery.map((image) => image.id),
      initialGallery.filter((image) => !removedImageIds.includes(image.id)).map((image) => image.id),
    );

  const hasChanges = isDirty || coverChanged || galleryChanged;

  // Warn before a reload or tab close throws unsaved work away.
  useEffect(() => {
    if (!hasChanges || isSubmitting) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasChanges, isSubmitting]);

  const leave = useCallback(() => navigate(listPath), [navigate, listPath]);
  const requestLeave = () => (hasChanges ? setConfirmLeave(true) : leave());
  const closeConfirmLeave = useCallback(() => setConfirmLeave(false), []);

  const onSubmit = async (formValues) => {
    try {
      let result;
      if (isEdit) {
        const changes = Object.fromEntries(
          SCALAR_FIELDS.filter((field) => formValues[field] !== defaultValues[field]).map((field) => [field, formValues[field]]),
        );
        LIST_FIELDS.forEach((field) => {
          if (!sameList(formValues[field], defaultValues[field])) changes[field] = formValues[field];
        });
        if (coverRemoved && !coverFile) changes.image_url = '';

        result = await dispatch(
          updateService({
            id: service._id,
            changes,
            coverFile: coverFile?.file,
            removedImageIds,
            newImages: gallery.filter((image) => image.isNew).map(({ id, file }) => ({ id, file })),
            galleryOrder: gallery.map(({ id, isNew }) => ({ id, isNew })),
          }),
        ).unwrap();
      } else {
        result = await dispatch(
          createService({
            ...formValues,
            coverFile: coverFile?.file,
            galleryFiles: gallery.map((image) => image.file),
          }),
        ).unwrap();
      }
      toast.success(result.message, { description: formValues.name });
      navigate(listPath);
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor -
      // e.g. a 409 for a name that's taken, or the featured limit.
    }
  };

  const onInvalid = () => toast.error('Some details need your attention before saving.');

  // ----- Derived display values -----
  const pricing = getServicePricing({ price: values.price, discountPrice: values.discountPrice });
  const priceIsSet = Number.isFinite(values.price) && values.price > 0;
  const durationText = values.durationLabel?.trim() || formatServiceDuration(values.durationInMinutes);
  const suggestedDurationLabel = formatServiceDuration(values.durationInMinutes);
  const selectedCategory = categories.find((category) => category._id === values.categoryId);
  const categoryMissing = categoriesReady && Boolean(values.categoryId) && !selectedCategory;
  const isInactive = values.status === SERVICE_STATUS.INACTIVE;

  const featuredLimit = summary?.featuredLimit ?? SERVICE_FEATURED_LIMIT;
  // The limit is shared by every vertical - featuredInUse counts them all.
  const canFeature = !summary || defaultValues.isFeatured || summary.featuredInUse < featuredLimit;
  const featuredHint = !summary
    ? `Up to ${featuredLimit} services at a time.`
    : canFeature
      ? `${summary.featuredInUse - (defaultValues.isFeatured ? 1 : 0) + (values.isFeatured ? 1 : 0)} of ${featuredLimit} Home page slots in use.`
      : `All ${featuredLimit} slots are taken - unfeature a service first.`;

  const sectionHasError = (section) => section.fields.some((field) => errors[field]);
  const jumpTo = (id) => document.getElementById(`service-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const actions = (
    <>
      <button
        type="button"
        onClick={requestLeave}
        disabled={isSubmitting}
        className="px-4 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting || (isEdit && !hasChanges)}
        className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : isEdit ? <Save size={18} /> : <Plus size={18} />}
        {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Service'}
      </button>
    </>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-6 animate-rise-in">
      {/* Header - same layout and classes as VerticalManagementPage's header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={requestLeave}
            disabled={isSubmitting}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition-colors disabled:opacity-50"
          >
            <ArrowLeft size={14} />
            Back to services
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{isEdit ? 'Edit Service' : 'Add Service'}</h1>
          <p className="text-sm text-slate-500 mt-1 truncate">
            {isEdit ? `Update “${service.name}”.` : 'Everything customers see on the service card and its details page.'}
          </p>
        </div>
        <div className="hidden sm:flex shrink-0 items-center gap-2">{actions}</div>
      </div>

      {/* Section jump bar - sticks under the Topbar while scrolling */}
      <nav
        aria-label="Form sections"
        className="sticky top-16 sm:top-20 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2.5 bg-slate-50/90 backdrop-blur-md"
      >
        <div className="flex gap-2 overflow-x-auto">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => jumpTo(section.id)}
              className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-teal-700 hover:ring-teal-200 transition-colors"
            >
              <section.icon size={14} />
              {section.label}
              {sectionHasError(section) && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" aria-label="has errors" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start">
        {/* ---------- Sections ---------- */}
        <div className="space-y-6 min-w-0">
          <Card id="basics" step={1} icon={Tag} title="Basics" description="The name and short line on the service card.">
            <div className="space-y-5">
              <Field id="service-name" label="Service name" required counter={[values.name?.length ?? 0, SERVICE_NAME_MAX]} error={errors.name}>
                <input
                  id="service-name"
                  type="text"
                  maxLength={SERVICE_NAME_MAX}
                  autoComplete="off"
                  autoFocus={!isEdit}
                  placeholder="e.g. Drain & Clog Removal"
                  aria-invalid={Boolean(errors.name)}
                  className={`${fieldClass(errors.name)} py-2.5 text-base font-semibold text-slate-800 placeholder:font-normal`}
                  {...register('name')}
                />
              </Field>

              <Field id="service-category" label="Category" required error={errors.categoryId}>
                <div className="relative">
                  <select
                    id="service-category"
                    aria-invalid={Boolean(errors.categoryId)}
                    disabled={!categoriesReady}
                    className={`${fieldClass(errors.categoryId)} appearance-none pr-9 cursor-pointer disabled:cursor-wait`}
                    value={values.categoryId ?? ''}
                    onChange={(event) => write('categoryId', event.target.value)}
                  >
                    <option value="">{categoriesReady ? 'Choose a category' : 'Loading categories…'}</option>
                    {values.categoryId && (!categoriesReady || categoryMissing) && (
                      <option value={values.categoryId}>{service?.category_data?.name ?? 'Current category'}</option>
                    )}
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                        {category.status === SERVICE_STATUS.INACTIVE ? ' (inactive)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                {selectedCategory?.status === SERVICE_STATUS.INACTIVE && (
                  <Callout tone="amber" icon={Info}>
                    This category is inactive, so customers won't see this service until it's activated.
                  </Callout>
                )}
              </Field>

              <Field
                id="service-description"
                label="Short description"
                required
                counter={[values.description?.length ?? 0, SERVICE_DESCRIPTION_MAX]}
                error={errors.description}
                hint="One line shown under the name. e.g. “Clear blocked drains & clogs.”"
              >
                <textarea
                  id="service-description"
                  rows={2}
                  maxLength={SERVICE_DESCRIPTION_MAX}
                  placeholder="What the service does, in a sentence."
                  aria-invalid={Boolean(errors.description)}
                  className={`${fieldClass(errors.description)} resize-none`}
                  {...register('description')}
                />
              </Field>
            </div>
          </Card>

          <Card id="pricing" step={2} icon={IndianRupee} title="Pricing & duration" description="What customers pay, and how long the job takes.">
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field id="service-price" label="Price" required error={errors.price} hint="The full price before any discount.">
                  <MoneyInput id="service-price" invalid={Boolean(errors.price)} registration={register('price', numberField)} placeholder="499" />
                </Field>
                <Field
                  id="service-discount"
                  label="Discounted price"
                  optional
                  error={errors.discountPrice}
                  hint={
                    pricing.percentOff
                      ? `Customers pay ${formatServicePrice(pricing.finalPrice)} · ${pricing.percentOff}% off`
                      : 'Leave at 0 for no discount.'
                  }
                >
                  <MoneyInput
                    id="service-discount"
                    invalid={Boolean(errors.discountPrice)}
                    registration={register('discountPrice', numberField)}
                    placeholder="0"
                  />
                  {priceIsSet && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {QUICK_DISCOUNTS.map((percent) => (
                        <button
                          key={percent}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => write('discountPrice', Math.round(values.price * (1 - percent / 100)))}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset transition-colors ${
                            pricing.percentOff === percent
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-500/30'
                              : 'bg-white text-slate-500 ring-slate-200 hover:text-teal-700 hover:ring-teal-300'
                          }`}
                        >
                          {percent}% off
                        </button>
                      ))}
                      {values.discountPrice > 0 && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => write('discountPrice', 0)}
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          No discount
                        </button>
                      )}
                    </div>
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field id="service-duration" label="Duration (minutes)" optional error={errors.durationInMinutes} hint="Used for sorting, and as the label below when that's empty.">
                  <div className="relative">
                    <Clock3 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="service-duration"
                      type="number"
                      min={0}
                      step={15}
                      inputMode="numeric"
                      className={`${fieldClass(errors.durationInMinutes)} pl-10 tabular-nums`}
                      {...register('durationInMinutes', numberField)}
                    />
                  </div>
                </Field>
                <Field
                  id="service-duration-label"
                  label="Duration label"
                  optional
                  counter={[values.durationLabel?.length ?? 0, SERVICE_DURATION_LABEL_MAX]}
                  error={errors.durationLabel}
                  hint="What the details page shows, e.g. “1–2 hours”."
                >
                  <input
                    id="service-duration-label"
                    type="text"
                    maxLength={SERVICE_DURATION_LABEL_MAX}
                    autoComplete="off"
                    placeholder={suggestedDurationLabel || 'e.g. 1–2 hours'}
                    className={fieldClass(errors.durationLabel)}
                    {...register('durationLabel')}
                  />
                  {suggestedDurationLabel && !values.durationLabel?.trim() && (
                    <button
                      type="button"
                      onClick={() => write('durationLabel', suggestedDurationLabel)}
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
                    >
                      <Wand2 size={11} />
                      Use “{suggestedDurationLabel}”
                    </button>
                  )}
                </Field>
              </div>
            </div>
          </Card>

          <Card
            id="details"
            step={3}
            icon={FileText}
            title="Details page"
            description="The content of the service's own page on the customer site."
          >
            <div className="space-y-6">
              <Field
                id="service-overview"
                label="Service details"
                optional
                counter={[values.overview?.length ?? 0, SERVICE_OVERVIEW_MAX]}
                error={errors.overview}
                hint="A few sentences on what's included and how the job is done."
              >
                <textarea
                  id="service-overview"
                  rows={5}
                  maxLength={SERVICE_OVERVIEW_MAX}
                  placeholder="e.g. Our vetted plumbing professionals bring their own tools and follow a standardized checklist…"
                  className={`${fieldClass(errors.overview)} resize-y leading-relaxed`}
                  {...register('overview')}
                />
              </Field>

              <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
                <Field id="service-what-you-get" label="What you'll get" optional>
                  <ServiceListField
                    id="service-what-you-get"
                    value={values.whatYouGet ?? []}
                    onChange={(next) => write('whatYouGet', next)}
                    disabled={isSubmitting}
                    placeholder="Add an item, e.g. 30-day warranty"
                    suggestions={WHAT_YOU_GET_SUGGESTIONS}
                    error={listError(errors.whatYouGet)}
                  />
                </Field>
                <Field id="service-benefits" label="Premium package benefits" optional>
                  <ServiceListField
                    id="service-benefits"
                    value={values.packageBenefits ?? []}
                    onChange={(next) => write('packageBenefits', next)}
                    disabled={isSubmitting}
                    placeholder="Add a benefit, e.g. Free rescheduling"
                    suggestions={BENEFIT_SUGGESTIONS}
                    error={listError(errors.packageBenefits)}
                  />
                </Field>
              </div>

              <Field id="service-skills" label="Skills and services" optional hint="">
                <ServiceSkillsField
                  id="service-skills"
                  value={values.skills ?? []}
                  onChange={(next) => write('skills', next)}
                  disabled={isSubmitting}
                  error={listError(errors.skills)}
                />
              </Field>
            </div>
          </Card>

          <Card id="media" step={4} icon={ImageIcon} title="Media" description="The cover image and the details page gallery.">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Cover image</p>
                <ServiceCoverField
                  previewUrl={coverPreviewUrl}
                  isNew={Boolean(coverFile)}
                  canRestore={Boolean(savedCoverUrl) && coverChanged}
                  disabled={isSubmitting}
                  onPick={pickCover}
                  onRemove={removeCover}
                  onRestore={restoreCover}
                />
              </div>
              <div className="min-w-0">
                <p className="mb-2 text-sm font-medium text-gray-700">Gallery</p>
                <ServiceGalleryField
                  images={gallery}
                  disabled={isSubmitting}
                  onAdd={addGalleryFiles}
                  onRemove={removeGalleryImage}
                  onReorder={setGallery}
                />
              </div>
            </div>
          </Card>

          <Card id="reviews" step={5} icon={Star} title="Reviews & ratings" description="Calculated from customer reviews - not typed in here.">
            {isEdit ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold text-slate-800 tabular-nums">
                    {service.reviewCount > 0 ? Number(service.rating).toFixed(1) : '—'}
                  </span>
                  <div>
                    <StarRow value={service.rating} />
                    <p className="mt-1 text-xs text-slate-500">
                      {service.reviewCount > 0
                        ? `From ${service.reviewCount} visible rating${service.reviewCount === 1 ? '' : 's'}`
                        : 'No reviews yet'}
                    </p>
                  </div>
                </div>
                <Link
                  to={`${getServiceReviewsPath(role)}?service=${service._id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
                >
                  <MessageSquareText size={16} />
                  Manage reviews
                </Link>
              </div>
            ) : (
              <Callout tone="slate" icon={Info}>
                Once the service is saved, add customer reviews and ratings from Reviews & Ratings Management. The rating on
                the card is calculated from them.
              </Callout>
            )}
          </Card>
        </div>

        {/* ---------- Side column ---------- */}
        <aside className="space-y-6 xl:sticky xl:top-36">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Visibility</h2>
            </div>
            <div className="space-y-3 px-4 py-5 sm:px-6">
              <SwitchRow
                icon={BadgeCheck}
                tone="bg-emerald-50 text-emerald-600"
                label={isInactive ? 'Inactive' : 'Active'}
                hint={isInactive ? 'Saved, but customers cannot see it.' : 'Bookable on the customer site.'}
                checked={!isInactive}
                disabled={isSubmitting}
                onChange={(checked) => write('status', checked ? SERVICE_STATUS.ACTIVE : SERVICE_STATUS.INACTIVE)}
              />
              <SwitchRow
                icon={Star}
                tone="bg-amber-50 text-amber-600"
                label="Featured"
                hint={featuredHint}
                checked={Boolean(values.isFeatured)}
                disabled={isSubmitting || (!canFeature && !values.isFeatured)}
                onChange={(checked) => write('isFeatured', checked)}
              />
            </div>
          </section>

          <section>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
              Live preview
            </p>
            <ServicePreviewCard
              name={values.name?.trim()}
              categoryName={selectedCategory?.name ?? service?.category_data?.name}
              coverUrl={coverPreviewUrl}
              price={values.price}
              discountPrice={values.discountPrice}
              rating={service?.rating ?? 0}
              reviewCount={service?.reviewCount ?? 0}
              durationText={durationText}
              isFeatured={values.isFeatured}
              isInactive={isInactive}
            />
          </section>
        </aside>
      </div>

      {/* Actions again at the end of the form - the only ones on a phone */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-4 sm:px-6">
        {isEdit && !hasChanges && (
          <span className="sm:mr-auto text-xs text-slate-400 text-center sm:text-left">Change something to enable saving</span>
        )}
        {actions}
      </div>

      {confirmLeave && (
        <ConfirmDialog
          title="Leave without saving?"
          icon={LogOut}
          tone="warning"
          confirmLabel="Yes, Leave"
          cancelLabel="Keep Editing"
          onCancel={closeConfirmLeave}
          onConfirm={leave}
          message="Your changes to this service haven't been saved and will be lost."
        />
      )}
    </form>
  );
}

// zod reports list problems either on the list or on one of its items.
const listError = (error) => {
  if (!error) return undefined;
  if (error.message) return error.message;
  const itemError = Array.isArray(error) ? error.find(Boolean) : null;
  return itemError?.message;
};

// Same card + header bar as the listing pages, with a numbered step badge.
function Card({ id, step, icon: Icon, title, description, children }) {
  return (
    <section id={`service-section-${id}`} className="scroll-mt-36 bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-slate-100">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
          <Icon size={19} />
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white ring-2 ring-white">
            {step}
          </span>
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="px-4 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function Field({ id, label, required = false, optional = false, counter, error, hint, children }) {
  return (
    <div className="space-y-1 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label} {required && <span className="text-rose-500">*</span>}
          {optional && <span className="font-normal text-slate-400">(optional)</span>}
        </label>
        {counter && (
          <span className={`shrink-0 text-[11px] tabular-nums ${counter[0] > counter[1] ? 'font-semibold text-rose-500' : 'text-slate-400'}`}>
            {counter[0]}/{counter[1]}
          </span>
        )}
      </div>
      {children}
      {error?.message ? (
        <p role="alert" className="text-xs font-medium text-rose-500">
          {error.message}
        </p>
      ) : (
        hint && <p className="text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

function MoneyInput({ id, invalid, registration, placeholder }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 pointer-events-none">₹</span>
      <input
        id={id}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        placeholder={placeholder}
        aria-invalid={invalid}
        className={`${fieldClass(invalid)} pl-8 tabular-nums font-semibold text-slate-800`}
        {...registration}
      />
    </div>
  );
}

function StarRow({ value }) {
  const rating = Number(value) || 0;
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, rating - (star - 1)));
        return (
          <span key={star} className="relative inline-flex">
            <Star size={18} className="fill-slate-200 text-slate-200" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={18} className="fill-amber-400 text-amber-400" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

function SwitchRow({ icon: Icon, tone, label, hint, checked, disabled, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${tone}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-teal-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}

const CALLOUT_TONES = {
  amber: 'bg-amber-50 text-amber-800',
  slate: 'bg-slate-50 text-slate-600',
};

function Callout({ tone, icon: Icon, children }) {
  return (
    <p className={`mt-3 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${CALLOUT_TONES[tone]}`}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
