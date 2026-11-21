import { useEffect } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { BriefcaseBusiness, Check, IndianRupee, Loader2, Plus, Save, Star, Trash2 } from 'lucide-react';
import {
  useProviderProfile,
  fetchMyProviderDetails,
  fetchExpertiseCategories,
  updateMyProviderDetails,
  providerProfileValidationSchema,
  PROVIDER_LANGUAGES,
  PROVIDER_BIO_MAX,
  PROVIDER_WHY_BOOK_MAX,
  PROVIDER_WHY_BOOK_ITEM_MAX,
} from '@/features/providerProfile/index.js';
import CategoryMultiSelect from './CategoryMultiSelect.jsx';

const fieldClass = (hasError) =>
  `input-field bg-slate-50 ${hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''}`;

// Backend profile -> form values. Numbers the provider hasn't filled in yet
// start as '' (an empty box); why_book always shows at least one row.
const toFormValues = (details) => ({
  languages: details?.languages ?? [],
  expertise_category_ids: (details?.expertise ?? []).map((category) => category._id),
  years_experience: details?.years_experience ?? '',
  per_hours_price: details?.per_hours_price ?? '',
  bio: details?.bio ?? '',
  why_book: (details?.why_book?.length ? details.why_book : ['']).map((value) => ({ value })),
});

// Provider-only card on My Profile: everything the customer site's Workers
// pages show about this provider. Name and phone stay in Personal
// Information, and email can't be changed here. Rating and review count are
// shown read-only - only the Super Admin sets them.
export default function ProviderDetailsCard() {
  const dispatch = useDispatch();
  const { details, status, categories } = useProviderProfile();

  useEffect(() => {
    dispatch(fetchMyProviderDetails());
    dispatch(fetchExpertiseCategories());
  }, [dispatch]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(providerProfileValidationSchema),
    defaultValues: toFormValues(details),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'why_book' });
  const bio = useWatch({ control, name: 'bio' }) ?? '';

  // Re-baseline whenever a fresh profile arrives (load or save).
  useEffect(() => {
    reset(toFormValues(details));
  }, [details, reset]);

  const onSubmit = async (values) => {
    try {
      const result = await dispatch(
        updateMyProviderDetails({ ...values, why_book: values.why_book.map((item) => item.value) }),
      ).unwrap();
      toast.success(result.message, { description: 'Customers will see these details on the Workers page.' });
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    }
  };

  const isLoading = status === 'loading' && !details;
  const ratings = Number(details?.ratings ?? 0);
  const reviewCount = Number(details?.review_count ?? 0);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between p-4 sm:p-6 border-b border-slate-100">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <BriefcaseBusiness size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800">Provider Details</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              What customers see about you on the Fixonest website.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 sm:shrink-0">
          <Star size={18} className="fill-amber-400 text-amber-400" />
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-800">
              {ratings.toFixed(1)}{' '}
              <span className="font-medium text-slate-500">
                ({reviewCount.toLocaleString()} {reviewCount === 1 ? 'review' : 'reviews'})
              </span>
            </p>
            <p className="text-[11px] text-slate-400">Set by the Fixonest team</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
          <Loader2 size={18} className="animate-spin" /> Loading your details...
        </div>
      ) : (
        <form
          id="provider-details-form"
          className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8 p-4 sm:p-6"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="space-y-5">
            <div className="space-y-1">
              <label htmlFor="provider-expertise" className="text-sm font-medium text-gray-700">
                Areas of Experience <span className="text-rose-500">*</span>
              </label>
              <Controller
                control={control}
                name="expertise_category_ids"
                render={({ field }) => (
                  <CategoryMultiSelect
                    id="provider-expertise"
                    categories={categories.items}
                    expertiseWithStatus={details?.expertise ?? []}
                    isLoading={categories.status === 'loading'}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.expertise_category_ids?.message}
                  />
                )}
              />
              <FieldMessage
                error={errors.expertise_category_ids?.message}
                hint="Service categories you're skilled in. Shown on your details page."
              />
            </div>

            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-700">
                Languages <span className="text-rose-500">*</span>
              </span>
              <Controller
                control={control}
                name="languages"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Languages">
                    {PROVIDER_LANGUAGES.map((language) => {
                      const isSelected = field.value.includes(language);
                      return (
                        <button
                          key={language}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() =>
                            field.onChange(
                              isSelected
                                ? field.value.filter((item) => item !== language)
                                : [...field.value, language],
                            )
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
                            isSelected
                              ? 'bg-teal-50 text-teal-700 ring-teal-200'
                              : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                          {language}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              <FieldMessage error={errors.languages?.message} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="provider-years" className="text-sm font-medium text-gray-700">
                  Years of experience <span className="text-rose-500">*</span>
                </label>
                <input
                  id="provider-years"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={60}
                  step={1}
                  placeholder="e.g. 5"
                  aria-invalid={Boolean(errors.years_experience)}
                  className={fieldClass(errors.years_experience)}
                  {...register('years_experience', { valueAsNumber: true })}
                />
                <FieldMessage error={errors.years_experience?.message} />
              </div>
              <div className="space-y-1">
                <label htmlFor="provider-price" className="text-sm font-medium text-gray-700">
                  Price per hour <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <IndianRupee
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    id="provider-price"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    step="any"
                    placeholder="e.g. 299"
                    aria-invalid={Boolean(errors.per_hours_price)}
                    className={`${fieldClass(errors.per_hours_price)} pl-9`}
                    {...register('per_hours_price', { valueAsNumber: true })}
                  />
                </div>
                <FieldMessage error={errors.per_hours_price?.message} />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="provider-bio" className="text-sm font-medium text-gray-700">
                  Bio <span className="text-rose-500">*</span>
                </label>
                <span
                  className={`text-[11px] tabular-nums ${bio.length > PROVIDER_BIO_MAX ? 'text-rose-500' : 'text-slate-400'}`}
                >
                  {bio.length}/{PROVIDER_BIO_MAX}
                </span>
              </div>
              <textarea
                id="provider-bio"
                rows={5}
                placeholder="e.g. I've fixed leaks, clogs and fittings across Kolkata for 8 years..."
                aria-invalid={Boolean(errors.bio)}
                className={`${fieldClass(errors.bio)} resize-y min-h-28 leading-relaxed`}
                {...register('bio')}
              />
              <FieldMessage
                error={errors.bio?.message}
                hint="Shown next to your photo and under Service Details."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Why book you <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {fields.length}/{PROVIDER_WHY_BOOK_MAX} points
                </span>
              </div>
              {fields.map((item, index) => {
                const error = errors.why_book?.[index]?.value?.message;
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={PROVIDER_WHY_BOOK_ITEM_MAX}
                        placeholder="e.g. Punctual & professional, every visit"
                        aria-label={`Point ${index + 1}`}
                        aria-invalid={Boolean(error)}
                        className={fieldClass(error)}
                        {...register(`why_book.${index}.value`)}
                      />
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        aria-label={`Remove point ${index + 1}`}
                        className="shrink-0 rounded-lg p-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <FieldMessage error={error} />
                  </div>
                );
              })}
              <FieldMessage error={errors.why_book?.message || errors.why_book?.root?.message} />
              {fields.length < PROVIDER_WHY_BOOK_MAX && (
                <button
                  type="button"
                  onClick={() => append({ value: '' })}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
                >
                  <Plus size={13} />
                  Add point
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
        <span className="text-xs text-slate-400 text-center sm:text-left">
          {isDirty ? 'You have unsaved changes' : "Everything's up to date"}
        </span>
        <div className="flex gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={() => reset()}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              Discard
            </button>
          )}
          <button
            type="submit"
            form="provider-details-form"
            disabled={isSubmitting || !isDirty || isLoading}
            className="flex-1 sm:flex-none btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Changes
          </button>
        </div>
      </div>
    </section>
  );
}

function FieldMessage({ error, hint }) {
  if (error) {
    return (
      <p role="alert" className="text-xs font-medium text-rose-500">
        {error}
      </p>
    );
  }
  return hint ? <p className="text-xs text-slate-400">{hint}</p> : null;
}
