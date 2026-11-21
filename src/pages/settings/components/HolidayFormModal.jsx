import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { CalendarPlus, Clock, DoorClosed, Loader2, PencilLine, Repeat, Save } from 'lucide-react';
import {
  HOLIDAY_TYPE_OPTIONS,
  HOLIDAY_TITLE_MAX,
  HOLIDAY_DESCRIPTION_MAX,
  holidayValidationSchema,
  addHoliday,
  updateHoliday,
  formatLongDate,
  formatTime,
  relativeDayLabel,
} from '@/features/workingHours/index.js';
import { Modal } from '@/components/common/modal/index.js';

const fieldClass = (hasError) =>
  `input-field bg-slate-50 ${hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''}`;

const FIELDS = ['date', 'title', 'description', 'type', 'isClosed', 'openTime', 'closeTime', 'recurringAnnually'];

// One modal for "Add Holiday" (no `holiday`) and "Edit Holiday". A holiday
// either closes the business for the whole day or keeps it open for special
// hours (e.g. a half day on a festival eve). Edit pre-fills from the list and
// sends only what changed.
export default function HolidayFormModal({ holiday = null, takenDates, onClose, onSaved }) {
  const dispatch = useDispatch();
  const isEdit = Boolean(holiday);

  const defaultValues = useMemo(
    () => ({
      date: holiday?.date ?? '',
      title: holiday?.title ?? '',
      description: holiday?.description ?? '',
      type: holiday?.type ?? 'public_holiday',
      isClosed: holiday ? holiday.isClosed : true,
      openTime: holiday?.openTime ?? '10:00',
      closeTime: holiday?.closeTime ?? '14:00',
      recurringAnnually: holiday?.recurringAnnually ?? false,
    }),
    [holiday],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(holidayValidationSchema), defaultValues });

  const [date, title = '', description = '', isClosed, openTime, closeTime] = useWatch({
    control,
    name: ['date', 'title', 'description', 'isClosed', 'openTime', 'closeTime'],
  });

  const onSubmit = async (values) => {
    // Checked here too so the message sits under the field instead of a 409 toast.
    if (values.date !== defaultValues.date && takenDates.has(values.date)) {
      setError('date', { message: 'Another holiday is already set on this date' });
      return;
    }
    const full = {
      ...values,
      openTime: values.isClosed ? null : values.openTime,
      closeTime: values.isClosed ? null : values.closeTime,
    };
    try {
      let result;
      if (isEdit) {
        const changes = {};
        FIELDS.forEach((key) => {
          if (full[key] !== (holiday[key] ?? (key === 'description' ? '' : null))) changes[key] = full[key];
        });
        if (Object.keys(changes).length === 0) {
          onClose();
          return;
        }
        result = await dispatch(updateHoliday({ id: holiday._id, payload: changes })).unwrap();
      } else {
        result = await dispatch(addHoliday(full)).unwrap();
      }
      toast.success(result.message);
      onSaved();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    }
  };

  const chooseType = (value) => {
    setValue('type', value, { shouldDirty: true });
    // A special working day means "open" - flip the closure off for them.
    if (value === 'special_working_day') setValue('isClosed', false, { shouldDirty: true });
  };

  return (
    <Modal
      title={isEdit ? 'Edit Holiday' : 'Add Holiday'}
      description={
        isEdit ? 'Update this date on the business calendar.' : 'Close the business, or set special hours, on a date.'
      }
      icon={isEdit ? PencilLine : CalendarPlus}
      size="lg"
      busy={isSubmitting}
      onClose={onClose}
      footer={
        <>
          {isEdit && !isDirty && (
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
            form="holiday-form"
            disabled={isSubmitting || (isEdit && !isDirty)}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isEdit ? (
              <Save size={18} />
            ) : (
              <CalendarPlus size={18} />
            )}
            {isEdit ? 'Save Changes' : 'Add Holiday'}
          </button>
        </>
      }
    >
      <form id="holiday-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Holiday</legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,11rem)_1fr]">
            {/* Date */}
            <div className="space-y-1">
              <label htmlFor="holiday-date" className="text-sm font-medium text-gray-700">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="holiday-date"
                type="date"
                aria-invalid={Boolean(errors.date)}
                className={fieldClass(errors.date)}
                {...register('date')}
              />
              {errors.date && (
                <p role="alert" className="text-xs font-medium text-rose-500">
                  {errors.date.message}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="holiday-title" className="text-sm font-medium text-gray-700">
                  Name <span className="text-rose-500">*</span>
                </label>
                <CharCount value={title} max={HOLIDAY_TITLE_MAX} />
              </div>
              <input
                id="holiday-title"
                type="text"
                autoFocus={!isEdit}
                placeholder="e.g. Diwali"
                aria-invalid={Boolean(errors.title)}
                className={fieldClass(errors.title)}
                {...register('title')}
              />
              {errors.title && (
                <p role="alert" className="text-xs font-medium text-rose-500">
                  {errors.title.message}
                </p>
              )}
            </div>
          </div>

          {date && !errors.date && (
            <p className="-mt-1 text-xs text-slate-500">
              {formatLongDate(date)} · <span className="font-medium text-teal-600">{relativeDayLabel(date)}</span>
            </p>
          )}

          {/* Type */}
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <div className="space-y-1.5">
                <span id="holiday-type-label" className="text-sm font-medium text-gray-700">
                  Type
                </span>
                <div role="radiogroup" aria-labelledby="holiday-type-label" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {HOLIDAY_TYPE_OPTIONS.map((option) => {
                    const active = field.value === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => chooseType(option.value)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 ${
                          active ? 'bg-teal-50/70 ring-teal-300 shadow-sm' : 'bg-white ring-slate-200 hover:ring-slate-300'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${option.badge}`}
                          aria-hidden="true"
                        >
                          <option.icon size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-700">{option.label}</span>
                          <span className="block truncate text-xs text-slate-500">{option.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          />

          {/* Note */}
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="holiday-description" className="text-sm font-medium text-gray-700">
                Note <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <CharCount value={description} max={HOLIDAY_DESCRIPTION_MAX} />
            </div>
            <textarea
              id="holiday-description"
              rows={2}
              placeholder="Anything the team should know about this day"
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

        <fieldset className="space-y-3">
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Service on this day
          </legend>

          <Controller
            name="isClosed"
            control={control}
            render={({ field }) => (
              <SwitchCard
                checked={field.value}
                onChange={field.onChange}
                disabled={isSubmitting}
                icon={field.value ? DoorClosed : Clock}
                tone={field.value ? 'rose' : 'teal'}
                title={field.value ? 'Closed all day' : 'Open with special hours'}
                text={
                  field.value
                    ? 'Customers can’t book any slot on this date.'
                    : 'Only the hours below are bookable - no breaks apply.'
                }
              />
            )}
          />

          <div className={`grid transition-all duration-300 ${isClosed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
            {/* `inert` (not `disabled`) while closed: React Hook Form reads a
                disabled input's value as undefined. */}
            <div className="overflow-hidden" inert={isClosed}>
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
                <TimeField
                  id="holiday-open"
                  label="Opens at"
                  error={errors.openTime}
                  hint={formatTime(openTime)}
                  registration={register('openTime')}
                />
                <TimeField
                  id="holiday-close"
                  label="Closes at"
                  error={errors.closeTime}
                  hint={formatTime(closeTime)}
                  registration={register('closeTime')}
                />
              </div>
            </div>
          </div>

          <Controller
            name="recurringAnnually"
            control={control}
            render={({ field }) => (
              <SwitchCard
                checked={field.value}
                onChange={field.onChange}
                disabled={isSubmitting}
                icon={Repeat}
                tone={field.value ? 'teal' : 'slate'}
                title="Repeat every year"
                text={
                  field.value
                    ? 'Applies on this day and month every year - no need to add it again.'
                    : 'Applies on this date only.'
                }
              />
            )}
          />
        </fieldset>
      </form>
    </Modal>
  );
}

const SWITCH_TONES = {
  teal: { card: 'bg-teal-50/60 ring-teal-100', icon: 'bg-teal-100 text-teal-600', track: 'bg-teal-500' },
  rose: { card: 'bg-rose-50/60 ring-rose-100', icon: 'bg-rose-100 text-rose-600', track: 'bg-rose-500' },
  slate: { card: 'bg-slate-50 ring-slate-200', icon: 'bg-slate-200 text-slate-500', track: 'bg-slate-300' },
};

// Same switch card as FaqFormModal's visibility toggle.
function SwitchCard({ checked, onChange, disabled, icon: Icon, tone, title, text }) {
  const colors = SWITCH_TONES[tone];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left ring-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-60 ${colors.card}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors.icon}`} aria-hidden="true">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-700">{title}</span>
        <span className="block text-xs text-slate-500">{text}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? colors.track : 'bg-slate-300'}`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  );
}

function TimeField({ id, label, error, hint, registration }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      <input
        id={id}
        type="time"
        aria-invalid={Boolean(error)}
        className={`${fieldClass(error)} bg-white tabular-nums`}
        {...registration}
      />
      {error ? (
        <p role="alert" className="text-xs font-medium text-rose-500">
          {error.message}
        </p>
      ) : (
        <p className="text-[11px] text-slate-400">{hint}</p>
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
