import { useFieldArray, useWatch } from 'react-hook-form';
import { Coffee, Copy, Moon, Plus, X } from 'lucide-react';
import { formatDuration, formatTime, fromMinutes, toMinutes, workingMinutes } from '@/features/workingHours/index.js';

const fieldClass = (hasError) =>
  `input-field bg-white px-2.5 py-1.5 text-sm tabular-nums ${
    hasError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''
  }`;

const TIMELINE_START = 6 * 60; // 6 AM
const TIMELINE_END = 23 * 60; // 11 PM
const span = TIMELINE_END - TIMELINE_START;
const pct = (minutes) =>
  `${(Math.min(Math.max(minutes - TIMELINE_START, 0), span) / span) * 100}%`;

// One day of the weekly schedule: open/closed switch, opening hours, breaks
// and a 6 AM - 11 PM timeline that shows the day at a glance.
export default function DayScheduleRow({ index, meta, control, register, setValue, errors, isToday, onCopy }) {
  const name = `weeklySchedule.${index}`;
  const day = useWatch({ control, name });
  const { fields, append, remove } = useFieldArray({ control, name: `${name}.breaks` });
  const dayErrors = errors?.weeklySchedule?.[index];
  const isOpen = Boolean(day?.isOpen);
  const minutes = workingMinutes(day);

  const addBreak = () => {
    // Suggest an hour in the middle of the day, kept inside opening hours.
    const open = toMinutes(day.openTime) ?? 9 * 60;
    const close = toMinutes(day.closeTime) ?? 19 * 60;
    const start = Math.max(open, Math.min(13 * 60, close - 60));
    append({
      title: fields.length ? 'Break' : 'Lunch Break',
      startTime: fromMinutes(start),
      endTime: fromMinutes(Math.min(start + 60, 23 * 60 + 59)),
    });
  };

  return (
    <li
      className={`rounded-2xl ring-1 transition-colors ${
        isOpen ? 'bg-white ring-slate-200/80 hover:ring-teal-200' : 'bg-slate-50/70 ring-slate-100'
      }`}
    >
      <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-[11rem_minmax(0,17rem)_1fr_auto] lg:items-center lg:gap-5">
        {/* Day + switch */}
        <div className="flex items-center justify-between gap-3 lg:justify-start">
          <button
            type="button"
            role="switch"
            aria-checked={isOpen}
            aria-label={`${meta.label} ${isOpen ? 'open' : 'closed'}`}
            onClick={() => setValue(`${name}.isOpen`, !isOpen, { shouldDirty: true, shouldValidate: true })}
            className="flex items-center gap-3 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
          >
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${isOpen ? 'bg-teal-500' : 'bg-slate-300'}`}
              aria-hidden="true"
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isOpen ? 'translate-x-5' : ''
                }`}
              />
            </span>
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                {meta.label}
                {isToday && (
                  <span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">Today</span>
                )}
              </span>
              <span className={`block text-xs ${isOpen ? 'text-slate-500' : 'text-slate-400'}`}>
                {isOpen ? `${formatDuration(minutes)} bookable` : 'Closed'}
              </span>
            </span>
          </button>
        </div>

        {/* Hours */}
        {isOpen ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
            <TimeInput
              label={`${meta.label} opening time`}
              error={dayErrors?.openTime}
              registration={register(`${name}.openTime`)}
            />
            <span className="pt-2 text-xs font-medium text-slate-400">to</span>
            <TimeInput
              label={`${meta.label} closing time`}
              error={dayErrors?.closeTime}
              registration={register(`${name}.closeTime`)}
            />
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <Moon size={15} className="shrink-0" />
            No bookings on {meta.label}s
          </p>
        )}

        {/* Timeline */}
        <Timeline day={day} isOpen={isOpen} />

        {/* Actions */}
        <div className="flex items-center justify-end gap-1">
          {isOpen && (
            <button
              type="button"
              onClick={addBreak}
              disabled={fields.length >= 4}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-40"
            >
              <Plus size={14} />
              Break
            </button>
          )}
          <button
            type="button"
            onClick={() => onCopy(index)}
            title={`Copy ${meta.label}'s hours to every day`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors"
          >
            <Copy size={14} />
            <span className="lg:hidden xl:inline">Copy to all</span>
          </button>
        </div>
      </div>

      {/* Breaks */}
      {isOpen && fields.length > 0 && (
        <ul className="flex flex-col gap-2 border-t border-dashed border-slate-200 px-3 py-3 sm:px-4 lg:pl-53">
          {fields.map((field, breakIndex) => {
            const breakErrors = dayErrors?.breaks?.[breakIndex];
            const message = breakErrors?.startTime?.message || breakErrors?.endTime?.message || breakErrors?.title?.message;
            return (
              <li key={field.id} className="animate-rise-in">
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50/60 px-2.5 py-2 ring-1 ring-amber-100">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <Coffee size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Break"
                    aria-label="Break name"
                    maxLength={60}
                    className="min-w-0 flex-1 basis-28 bg-transparent px-1 py-1 text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none rounded focus:bg-white focus:ring-2 focus:ring-teal-500/40"
                    {...register(`${name}.breaks.${breakIndex}.title`)}
                  />
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      aria-label="Break start"
                      aria-invalid={Boolean(breakErrors?.startTime)}
                      className={`${fieldClass(breakErrors?.startTime)} w-30`}
                      {...register(`${name}.breaks.${breakIndex}.startTime`)}
                    />
                    <span className="text-xs text-slate-400">–</span>
                    <input
                      type="time"
                      aria-label="Break end"
                      aria-invalid={Boolean(breakErrors?.endTime)}
                      className={`${fieldClass(breakErrors?.endTime)} w-30`}
                      {...register(`${name}.breaks.${breakIndex}.endTime`)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(breakIndex)}
                    aria-label="Remove break"
                    className="p-1.5 rounded-lg text-amber-600/70 hover:text-rose-500 hover:bg-white transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
                {message && (
                  <p role="alert" className="mt-1 pl-11 text-xs font-medium text-rose-500">
                    {message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function TimeInput({ label, error, registration }) {
  return (
    <div className="min-w-0">
      <input type="time" aria-label={label} aria-invalid={Boolean(error)} className={fieldClass(error)} {...registration} />
      {error && (
        <p role="alert" className="mt-1 text-[11px] font-medium leading-tight text-rose-500">
          {error.message}
        </p>
      )}
    </div>
  );
}

function Timeline({ day, isOpen }) {
  const open = toMinutes(day?.openTime);
  const close = toMinutes(day?.closeTime);
  const valid = isOpen && open !== null && close !== null && close > open;

  return (
    <div className="hidden sm:block" aria-hidden="true">
      <div className="relative h-7 rounded-lg bg-slate-100/80 overflow-hidden">
        {/* Hour grid */}
        {[9, 12, 15, 18, 21].map((hour) => (
          <span key={hour} className="absolute inset-y-0 w-px bg-white" style={{ left: pct(hour * 60) }} />
        ))}
        {valid && (
          <>
            <span
              className="absolute inset-y-1 rounded-md bg-linear-to-r from-teal-400 to-teal-500 shadow-sm shadow-teal-500/30 transition-all duration-300"
              style={{ left: pct(open), width: `calc(${pct(close)} - ${pct(open)})` }}
            />
            {(day.breaks ?? []).map((item, index) => {
              const start = toMinutes(item.startTime);
              const end = toMinutes(item.endTime);
              if (start === null || end === null || end <= start) return null;
              return (
                <span
                  key={index}
                  className="absolute inset-y-1 rounded-sm bg-[repeating-linear-gradient(135deg,var(--color-amber-300)_0,var(--color-amber-300)_3px,var(--color-amber-100)_3px,var(--color-amber-100)_6px)] transition-all duration-300"
                  style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` }}
                />
              );
            })}
          </>
        )}
      </div>
      <div className="relative mt-1 h-3 text-[10px] text-slate-400">
        {[9, 12, 15, 18, 21].map((hour) => (
          <span key={hour} className="absolute -translate-x-1/2 tabular-nums" style={{ left: pct(hour * 60) }}>
            {formatTime(`${String(hour).padStart(2, '0')}:00`).replace(':00', '')}
          </span>
        ))}
      </div>
    </div>
  );
}
