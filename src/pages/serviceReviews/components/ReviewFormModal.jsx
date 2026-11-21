import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { CalendarDays, Eye, ImageOff, Info, Loader2, MessageSquarePlus, PencilLine, Save } from 'lucide-react';
import Avatar from '@/components/common/avatar/Avatar.jsx';
import { Modal } from '@/components/common/modal/index.js';
import {
  SERVICE_REVIEW_COMMENT_MAX,
  SERVICE_REVIEW_STATUS,
  serviceReviewValidationSchema,
  buildCustomerAvatarUrl,
  buildServiceThumbUrl,
  toDateInputValue,
  searchReviewCustomers,
  createServiceReview,
  updateServiceReview,
} from '@/features/serviceReview/index.js';
import SearchablePicker from './SearchablePicker.jsx';
import { StarPicker } from './ReviewStars.jsx';

const CUSTOMER_SEARCH_DEBOUNCE_MS = 300;

const serviceMedia = (path) => {
  const url = buildServiceThumbUrl(path);
  return url ? (
    <img src={url} alt="" className="h-9 w-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
  ) : (
    <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
      <ImageOff size={14} />
    </span>
  );
};

const toServiceOption = (service) => ({
  value: service._id,
  label: service.name,
  sublabel: service.categoryName ?? service.category?.name ?? '',
  media: serviceMedia(service.image_url),
});

const toCustomerOption = (customer) => ({
  value: customer._id,
  label: customer.fullName,
  sublabel: customer.email,
  media: (
    <Avatar src={buildCustomerAvatarUrl(customer.profile_image)} name={customer.fullName} className="h-9 w-9 text-xs" />
  ),
  disabled: Boolean(customer.alreadyRated),
  badge: customer.alreadyRated ? (
    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Already reviewed</span>
  ) : null,
});

// Add or edit one review & rating. Adding: pick the service and the
// registered customer who wrote it (customers who already reviewed that
// service can't be picked again). Editing: service and customer are fixed;
// the stars, text, date and visibility can change - an emptied text keeps
// the rating without a written review.
export default function ReviewFormModal({ review = null, presetServiceId = '', services, servicesReady, onClose, onSaved }) {
  const dispatch = useDispatch();
  const isEdit = Boolean(review);

  const defaultValues = useMemo(
    () => ({
      serviceId: review?.service?._id ?? presetServiceId ?? '',
      customerId: review?.customer?._id ?? '',
      rating: review?.rating ?? 0,
      comment: review?.comment ?? '',
      reviewedAt: toDateInputValue(review?.reviewedAt ?? new Date()),
      isVisible: review ? review.status === SERVICE_REVIEW_STATUS.VISIBLE : true,
    }),
    [review, presetServiceId],
  );

  const {
    handleSubmit,
    register,
    setValue,
    control,
    formState: { errors, isSubmitting, isDirty, isSubmitted },
  } = useForm({ resolver: zodResolver(serviceReviewValidationSchema), defaultValues });
  const values = useWatch({ control });
  const write = (field, value) => setValue(field, value, { shouldDirty: true, shouldValidate: isSubmitted });

  // ----- Service picker (filtered in the browser - the list is small) -----
  const [serviceQuery, setServiceQuery] = useState('');
  const serviceOptions = useMemo(() => {
    const query = serviceQuery.trim().toLowerCase();
    return services
      .filter((service) => !query || `${service.name} ${service.categoryName}`.toLowerCase().includes(query))
      .map(toServiceOption);
  }, [services, serviceQuery]);
  const selectedService = isEdit
    ? toServiceOption({ ...review.service, categoryName: review.category?.name })
    : (serviceOptions.find((option) => option.value === values.serviceId) ??
      services.filter((service) => service._id === values.serviceId).map(toServiceOption)[0] ??
      null);

  // ----- Customer picker (searched on the server, marked per service) -----
  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(!isEdit);
  const [pickedCustomer, setPickedCustomer] = useState(null);

  useEffect(() => {
    if (isEdit) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      setCustomersLoading(true);
      dispatch(searchReviewCustomers({ search: customerQuery, serviceId: values.serviceId }))
        .unwrap()
        .then((items) => {
          if (cancelled) return;
          setCustomers(items);
          // The chosen customer may already have reviewed a newly picked service.
          const current = items.find((customer) => customer._id === values.customerId);
          if (current?.alreadyRated) {
            setValue('customerId', '', { shouldDirty: true });
            setPickedCustomer(null);
            toast.info(`${current.fullName} has already reviewed this service`, {
              description: 'Pick another customer, or edit their existing review.',
            });
          }
        })
        .catch(() => {})
        .finally(() => !cancelled && setCustomersLoading(false));
    }, CUSTOMER_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // values.customerId is read only to re-check the current pick; re-running for it isn't needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isEdit, customerQuery, values.serviceId, setValue]);

  const customerOptions = customers.map(toCustomerOption);
  const selectedCustomer = isEdit ? toCustomerOption(review.customer ?? {}) : pickedCustomer && toCustomerOption(pickedCustomer);

  const onSubmit = async (formValues) => {
    const reviewedAt = new Date(`${formValues.reviewedAt}T12:00:00`).toISOString();
    const status = formValues.isVisible ? SERVICE_REVIEW_STATUS.VISIBLE : SERVICE_REVIEW_STATUS.HIDDEN;
    try {
      let result;
      if (isEdit) {
        const changes = {};
        if (formValues.rating !== defaultValues.rating) changes.rating = formValues.rating;
        if (formValues.comment.trim() !== defaultValues.comment.trim()) changes.comment = formValues.comment.trim();
        if (formValues.reviewedAt !== defaultValues.reviewedAt) changes.reviewedAt = reviewedAt;
        if (formValues.isVisible !== defaultValues.isVisible) changes.status = status;
        result = await dispatch(updateServiceReview({ id: review._id, changes })).unwrap();
      } else {
        result = await dispatch(
          createServiceReview({
            serviceId: formValues.serviceId,
            customerId: formValues.customerId,
            rating: formValues.rating,
            comment: formValues.comment.trim(),
            reviewedAt,
            status,
          }),
        ).unwrap();
      }
      toast.success(result.message);
      onSaved(result.data);
    } catch {
      // Already surfaced globally by lib/httpClient.js - e.g. the 409 for a
      // customer who already reviewed this service.
    }
  };

  const commentLength = values.comment?.length ?? 0;

  const footer = (
    <>
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
        form="review-form"
        disabled={isSubmitting || (isEdit && !isDirty)}
        className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : isEdit ? <Save size={18} /> : <MessageSquarePlus size={18} />}
        {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Review'}
      </button>
    </>
  );

  return (
    <Modal
      title={isEdit ? 'Edit review' : 'Add a review'}
      description={isEdit ? 'Change the stars, the text, the date or whether customers can see it.' : 'Record a registered customer’s rating and review of a service.'}
      icon={isEdit ? PencilLine : MessageSquarePlus}
      size="lg"
      busy={isSubmitting}
      onClose={onClose}
      footer={footer}
    >
      <form id="review-form" onSubmit={handleSubmit(onSubmit, () => toast.error('Some details need your attention.'))} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Service" required error={errors.serviceId} htmlFor="review-service">
            <SearchablePicker
              id="review-service"
              selected={selectedService}
              options={serviceOptions}
              onSelect={(option) => write('serviceId', option.value)}
              onSearchChange={setServiceQuery}
              placeholder={servicesReady ? 'Choose a service' : 'Loading services…'}
              searchPlaceholder="Search services"
              loading={!servicesReady}
              disabled={isEdit || isSubmitting}
              invalid={Boolean(errors.serviceId)}
            />
          </Field>
          <Field label="Customer" required error={errors.customerId} htmlFor="review-customer">
            <SearchablePicker
              id="review-customer"
              selected={selectedCustomer}
              options={customerOptions}
              onSelect={(option) => {
                setPickedCustomer(customers.find((customer) => customer._id === option.value) ?? null);
                write('customerId', option.value);
              }}
              onSearchChange={setCustomerQuery}
              placeholder="Choose a registered customer"
              searchPlaceholder="Search by name or email"
              emptyText="No registered customer matches"
              loading={customersLoading}
              disabled={isEdit || isSubmitting}
              invalid={Boolean(errors.customerId)}
            />
          </Field>
        </div>
        {isEdit && (
          <p className="-mt-2 flex items-start gap-2 text-xs text-slate-400">
            <Info size={13} className="mt-0.5 shrink-0" />
            The service and customer of a review can’t change. Delete it and add a new one instead.
          </p>
        )}

        <Field label="Rating" required error={errors.rating} htmlFor="review-rating">
          <StarPicker
            id="review-rating"
            value={values.rating}
            onChange={(star) => write('rating', star)}
            disabled={isSubmitting}
            invalid={Boolean(errors.rating)}
          />
        </Field>

        <Field
          label="Review"
          optional
          error={errors.comment}
          htmlFor="review-comment"
          counter={[commentLength, SERVICE_REVIEW_COMMENT_MAX]}
          hint="Leave empty to save only the star rating, without a written review."
        >
          <textarea
            id="review-comment"
            rows={4}
            maxLength={SERVICE_REVIEW_COMMENT_MAX}
            placeholder="What the customer said about the service…"
            className={`input-field bg-slate-50 resize-y leading-relaxed ${errors.comment ? 'border-rose-300' : ''}`}
            {...register('comment')}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Review date" required error={errors.reviewedAt} htmlFor="review-date">
            <div className="relative">
              <CalendarDays size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="review-date"
                type="date"
                max={toDateInputValue(new Date())}
                className={`input-field bg-slate-50 pl-10 ${errors.reviewedAt ? 'border-rose-300' : ''}`}
                {...register('reviewedAt')}
              />
            </div>
          </Field>
          <div className="flex items-end">
            <div className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Eye size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-700">{values.isVisible ? 'Visible' : 'Hidden'}</p>
                <p className="text-xs text-slate-400">
                  {values.isVisible ? 'Shown on the service page and counted.' : 'Not shown, not counted.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={values.isVisible}
                aria-label="Visible on the customer site"
                disabled={isSubmitting}
                onClick={() => write('isVisible', !values.isVisible)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 disabled:opacity-50 ${
                  values.isVisible ? 'bg-teal-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${values.isVisible ? 'translate-x-5' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, required = false, optional = false, error, htmlFor, counter, hint, children }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
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
