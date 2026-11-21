import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { CalendarClock, Clock, Globe, Info, Loader2, RotateCcw, Save, Timer } from 'lucide-react';
import {
  WEEK_DAYS,
  SLOT_SETTING_FIELDS,
  workingHoursValidationSchema,
  saveWorkingHours,
  buildSlots,
  formatDuration,
  formatTime,
  workingMinutes,
} from '@/features/workingHours/index.js';
import DayScheduleRow from './DayScheduleRow.jsx';

// Saved config -> form values: days in WEEK_DAYS order (Monday first), with
// break `_id`s dropped (the backend replaces a day's breaks on save).
const toFormValues = (weeklySchedule = [], slotSettings = {}) => ({
  weeklySchedule: WEEK_DAYS.map((meta) => {
    const saved = weeklySchedule.find((item) => item.dayIndex === meta.dayIndex) ?? {};
    return {
      day: meta.day,
      dayIndex: meta.dayIndex,
      isOpen: saved.isOpen ?? false,
      openTime: saved.openTime ?? '09:00',
      closeTime: saved.closeTime ?? '19:00',
      breaks: (saved.breaks ?? []).map((item) => ({
        title: item.title ?? '',
        startTime: item.startTime,
        endTime: item.endTime,
      })),
    };
  }),
  slotSettings: Object.fromEntries(
    SLOT_SETTING_FIELDS.map((field) => [field.name, slotSettings[field.name] ?? field.min]),
  ),
});

// "Business Working Hours": the weekly hours providers take bookings in, and
// how those hours are cut into booking slots. One form for the whole week,
// saved with a single PATCH; a bar at the bottom appears while there are
// unsaved changes.
export default function WorkingHoursSection({ id, config, isLoading }) {
  const dispatch = useDispatch();
  const weeklySchedule = config?.weeklySchedule;
  const slotSettings = config?.slotSettings;
  const defaultValues = useMemo(() => toFormValues(weeklySchedule, slotSettings), [weeklySchedule, slotSettings]);

  const {
    control,
    register,
    setValue,
    getValues,
    reset,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({ resolver: zodResolver(workingHoursValidationSchema), defaultValues });

  // Load (and re-load after a save) the saved hours. Holiday changes don't
  // touch these references, so they never wipe unsaved edits.
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const days = useWatch({ control, name: 'weeklySchedule' }) ?? defaultValues.weeklySchedule;
  const settings = useWatch({ control, name: 'slotSettings' }) ?? defaultValues.slotSettings;

  const todayIndex = new Date().getDay();
  const openDays = days.filter((day) => day.isOpen).length;
  const weeklyMinutes = days.reduce((sum, day) => sum + workingMinutes(day), 0);

  const copyToAll = (fromIndex) => {
    const source = getValues(`weeklySchedule.${fromIndex}`);
    WEEK_DAYS.forEach((_, index) => {
      if (index === fromIndex) return;
      setValue(`weeklySchedule.${index}.isOpen`, source.isOpen, { shouldDirty: true });
      setValue(`weeklySchedule.${index}.openTime`, source.openTime, { shouldDirty: true });
      setValue(`weeklySchedule.${index}.closeTime`, source.closeTime, { shouldDirty: true });
      setValue(
        `weeklySchedule.${index}.breaks`,
        source.breaks.map((item) => ({ ...item })),
        { shouldDirty: true },
      );
    });
    toast.success(`${WEEK_DAYS[fromIndex].label}'s hours copied to every day`, {
      description: 'Review the week, then save to apply.',
    });
  };

  const onSubmit = async (values) => {
    try {
      const result = await dispatch(saveWorkingHours(values)).unwrap();
      toast.success(result.message);
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    }
  };

  const onInvalid = () => toast.error('Some hours need fixing', { description: 'Check the fields marked in red.' });

  return (
    <form id={id} onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-6 scroll-mt-6">
      <section
        aria-labelledby={`${id}-title`}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 sm:px-6 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div className="min-w-0">
              <h2 id={`${id}-title`} className="text-lg font-bold text-slate-800">
                Manage Business Working Hours
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">The hours providers are available to serve customers</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              <CalendarClock size={13} />
              {isLoading ? '–' : `${openDays} of 7 days`} · {isLoading ? '–' : formatDuration(weeklyMinutes)} / week
            </span>
            {config?.timezone && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                <Globe size={13} />
                {config.timezone}
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <ScheduleSkeleton />
        ) : (
          <div className="p-3 sm:p-5">
            <ul className="space-y-2.5">
              {WEEK_DAYS.map((meta, index) => (
                <DayScheduleRow
                  key={meta.day}
                  index={index}
                  meta={meta}
                  control={control}
                  register={register}
                  setValue={setValue}
                  errors={errors}
                  isToday={meta.dayIndex === todayIndex}
                  onCopy={copyToAll}
                />
              ))}
            </ul>
            <p className="mt-4 flex items-start gap-1.5 px-1 text-xs text-slate-400">
              <Info size={13} className="mt-px shrink-0" />
              Holidays above override these hours on their dates. Breaks are never offered as booking slots.
            </p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <SlotSettingsCard register={register} errors={errors} isLoading={isLoading} />
        <SlotPreviewCard days={days} settings={settings} isLoading={isLoading} todayIndex={todayIndex} />
      </div>

      {/* Unsaved-changes bar - sticks to the bottom of the scrolling column */}
      <div
        className={`sticky bottom-4 z-20 transition-all duration-300 ${
          isDirty ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
        aria-hidden={!isDirty}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl bg-slate-900/95 px-4 py-3 text-white shadow-2xl shadow-slate-900/30 backdrop-blur sm:flex-row sm:items-center sm:px-5">
          <p className="flex flex-1 items-center gap-2.5 text-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
            </span>
            You have unsaved changes to the working hours
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => reset(defaultValues)}
              disabled={isSubmitting || !isDirty}
              tabIndex={isDirty ? 0 : -1}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
            >
              <RotateCcw size={15} />
              Discard
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              tabIndex={isDirty ? 0 : -1}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-teal-500 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-teal-500/30 hover:from-teal-400 hover:to-teal-500 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Hours
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function SlotSettingsCard({ register, errors, isLoading }) {
  return (
    <section className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Timer size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-800">Booking Slots</h3>
          <p className="text-xs text-slate-400 mt-0.5">How the working hours are split into bookable slots</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6">
        {SLOT_SETTING_FIELDS.map((field) => {
          const error = errors?.slotSettings?.[field.name];
          return (
            <div key={field.name} className="space-y-1">
              <label htmlFor={`slot-${field.name}`} className="text-sm font-medium text-gray-700">
                {field.label}
              </label>
              <div className="relative">
                <input
                  id={`slot-${field.name}`}
                  type="number"
                  inputMode="numeric"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  readOnly={isLoading}
                  aria-invalid={Boolean(error)}
                  className={`input-field bg-slate-50 pr-24 tabular-nums ${
                    error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''
                  }`}
                  {...register(`slotSettings.${field.name}`, { valueAsNumber: true })}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
                  {field.unit}
                </span>
              </div>
              {error ? (
                <p role="alert" className="text-xs font-medium text-rose-500">
                  {error.message}
                </p>
              ) : (
                <p className="text-xs text-slate-400">{field.hint}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Live preview of the slots one day produces with the values on screen
// (saved or not) - same maths as the backend's generateSlotsForDate.
function SlotPreviewCard({ days, settings, isLoading, todayIndex }) {
  const [selected, setSelected] = useState(() => Math.max(WEEK_DAYS.findIndex((meta) => meta.dayIndex === todayIndex), 0));
  const day = days[selected];
  const slots = useMemo(() => buildSlots(day, settings), [day, settings]);
  const meta = WEEK_DAYS[selected];

  return (
    <section className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 border-b border-slate-100">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-800">Slot Preview</h3>
          <p className="text-xs text-slate-400 mt-0.5">What customers can pick, before you save</p>
        </div>
        <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 tabular-nums">
          {isLoading ? '–' : `${slots.length} slots`}
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto px-4 pt-4 sm:px-6" role="tablist" aria-label="Preview day">
        {WEEK_DAYS.map((item, index) => {
          const active = index === selected;
          const open = days[index]?.isOpen;
          return (
            <button
              key={item.day}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(index)}
              className={`flex min-w-11 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition-all ${
                active ? 'bg-teal-600 text-white shadow-md shadow-teal-500/30' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {item.short}
              <span
                className={`h-1.5 w-1.5 rounded-full ${open ? (active ? 'bg-white' : 'bg-teal-500') : active ? 'bg-white/40' : 'bg-slate-300'}`}
              />
            </button>
          );
        })}
      </div>

      <div className="flex-1 p-4 sm:p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <div key={key} className="h-9 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : !day?.isOpen ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <CalendarClock size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Closed on {meta.label}s</p>
            <p className="mt-0.5 text-xs text-slate-400">Turn the day on above to offer slots.</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">No slots fit these hours</p>
            <p className="mt-0.5 text-xs text-slate-400">Make the day longer or the slots shorter.</p>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-64 overflow-y-auto pr-1">
              {slots.map((slot, index) => (
                <li
                  key={slot.startTime}
                  className="rounded-lg bg-teal-50/70 px-2 py-2 text-center text-xs font-semibold text-teal-800 ring-1 ring-teal-100 tabular-nums animate-rise-in"
                  style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
                >
                  {formatTime(slot.startTime)}
                  <span className="block text-[10px] font-medium text-teal-600/70">to {formatTime(slot.endTime)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-400">
              {formatTime(day.openTime)} – {formatTime(day.closeTime)} · {settings.slotDurationMinutes || '–'} min slots,{' '}
              {Number(settings.bufferMinutes) > 0 ? `${settings.bufferMinutes} min apart` : 'back to back'}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function ScheduleSkeleton() {
  return (
    <ul className="space-y-2.5 p-3 sm:p-5" aria-hidden="true">
      {WEEK_DAYS.map((meta) => (
        <li key={meta.day} className="flex items-center gap-4 rounded-2xl p-4 ring-1 ring-slate-100">
          <div className="h-6 w-11 rounded-full bg-slate-100 animate-pulse" />
          <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
          <div className="hidden sm:block h-7 flex-1 rounded-lg bg-slate-100 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}
