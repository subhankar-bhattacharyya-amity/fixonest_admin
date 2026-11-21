import { ArrowLeft, ArrowRight, Eye, MapPin, PauseCircle, PencilLine, PlayCircle, Quote, Trash2 } from 'lucide-react';
import {
  TESTIMONIAL_STATUS,
  RATING_LABELS,
  getTestimonialStatus,
  buildTestimonialAvatarUrl,
} from '@/features/testimonial/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import RatingStars from './RatingStars.jsx';

// The testimonials in carousel order, as cards shaped like the ones on the
// customer site's Home page, so the Super Admin sees what customers see.
// Purely presentational - the page owns loading, filters, reordering and dialogs.
// `canReorder` is false while a search or filter hides some cards, because
// "move earlier" would then be ambiguous.
export default function TestimonialGrid({
  testimonials,
  isLoading,
  canReorder,
  reorderBusy,
  onMove,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}) {
  if (isLoading && testimonials.length === 0) return <GridSkeleton />;

  const actions = { onView, onEdit, onToggleStatus, onDelete };

  return (
    <ol
      className={`grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-6 xl:grid-cols-3 transition-opacity duration-200 ${
        isLoading ? 'opacity-60' : ''
      }`}
    >
      {testimonials.map((testimonial, index) => (
        <TestimonialCard
          key={testimonial._id}
          testimonial={testimonial}
          index={index}
          reorder={
            canReorder && {
              busy: reorderBusy,
              isFirst: index === 0,
              isLast: index === testimonials.length - 1,
              onEarlier: () => onMove(testimonial, -1),
              onLater: () => onMove(testimonial, 1),
            }
          }
          {...actions}
        />
      ))}
    </ol>
  );
}

function TestimonialCard({ testimonial, index, reorder, onView, onEdit, onToggleStatus, onDelete }) {
  const isHidden = testimonial.status === TESTIMONIAL_STATUS.INACTIVE;
  const status = getTestimonialStatus(testimonial.status);
  const subtitle = [testimonial.service, testimonial.location].filter(Boolean);

  return (
    <li
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 animate-rise-in hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70 ${
        isHidden ? 'border-dashed border-slate-200' : 'border-slate-100 shadow-sm'
      }`}
      style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
    >
      {/* Teal accent along the top on hover */}
      <span
        className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-teal-400 to-teal-600 opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={() => onView(testimonial)}
        aria-label={`View the review by ${testimonial.name}`}
        className={`flex flex-1 flex-col p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500/50 ${
          isHidden ? 'opacity-70' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-teal-50 px-2 text-xs font-bold tabular-nums text-teal-600 ring-1 ring-teal-100"
            title={`Position ${index + 1} in the carousel`}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
            {status.label}
          </span>
        </div>

        <Quote size={30} className="mt-4 text-teal-200 transition-colors group-hover:text-teal-300" aria-hidden="true" />

        <div className="mt-2 flex items-center gap-2">
          <RatingStars rating={testimonial.rating} />
          <span className="text-xs font-medium text-slate-400">{RATING_LABELS[testimonial.rating]}</span>
        </div>

        <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-4">“{testimonial.quote}”</p>

        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
          <Avatar
            src={buildTestimonialAvatarUrl(testimonial.avatar)}
            name={testimonial.name}
            className="h-11 w-11 text-sm ring-2 ring-white shadow-sm shadow-slate-300/60"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{testimonial.name}</p>
            {subtitle.length > 0 && (
              <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                {testimonial.location && <MapPin size={11} className="shrink-0" aria-hidden="true" />}
                <span className="truncate">{subtitle.join(' · ')}</span>
              </p>
            )}
          </div>
        </div>
      </button>

      {/* Action bar */}
      <div className="flex items-center gap-1 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
        {reorder && <ReorderButtons {...reorder} name={testimonial.name} />}
        <div className="ml-auto flex items-center gap-0.5">
          <RowActions
            testimonial={testimonial}
            onView={onView}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
          />
        </div>
      </div>
    </li>
  );
}

const iconButton =
  'p-2 rounded-lg text-slate-500 transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500';

function ReorderButtons({ busy, isFirst, isLast, onEarlier, onLater, name }) {
  return (
    <div className="flex items-center rounded-lg bg-white ring-1 ring-slate-200">
      <button
        type="button"
        onClick={onEarlier}
        disabled={busy || isFirst}
        aria-label={`Move ${name}'s review earlier`}
        title="Move earlier in the carousel"
        className={`${iconButton} rounded-r-none hover:text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500/50`}
      >
        <ArrowLeft size={15} />
      </button>
      <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
      <button
        type="button"
        onClick={onLater}
        disabled={busy || isLast}
        aria-label={`Move ${name}'s review later`}
        title="Move later in the carousel"
        className={`${iconButton} rounded-l-none hover:text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500/50`}
      >
        <ArrowRight size={15} />
      </button>
    </div>
  );
}

function RowActions({ testimonial, onView, onEdit, onToggleStatus, onDelete }) {
  const isHidden = testimonial.status === TESTIMONIAL_STATUS.INACTIVE;
  const ToggleIcon = isHidden ? PlayCircle : PauseCircle;
  return (
    <>
      <button
        type="button"
        onClick={() => onView(testimonial)}
        aria-label="View testimonial"
        title="View"
        className={`${iconButton} hover:text-sky-600 hover:bg-sky-50 focus-visible:ring-sky-500/50`}
      >
        <Eye size={17} />
      </button>
      <button
        type="button"
        onClick={() => onEdit(testimonial)}
        aria-label="Edit testimonial"
        title="Edit"
        className={`${iconButton} hover:text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500/50`}
      >
        <PencilLine size={17} />
      </button>
      <button
        type="button"
        onClick={() => onToggleStatus(testimonial)}
        aria-label={isHidden ? 'Show testimonial on the website' : 'Hide testimonial from the website'}
        title={isHidden ? 'Show on website' : 'Hide from website'}
        className={`${iconButton} ${
          isHidden
            ? 'hover:text-emerald-600 hover:bg-emerald-50 focus-visible:ring-emerald-500/50'
            : 'hover:text-amber-600 hover:bg-amber-50 focus-visible:ring-amber-500/50'
        }`}
      >
        <ToggleIcon size={17} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(testimonial)}
        aria-label="Delete testimonial"
        title="Delete"
        className={`${iconButton} hover:text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-500/50`}
      >
        <Trash2 size={17} />
      </button>
    </>
  );
}

function GridSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-6 xl:grid-cols-3 animate-pulse"
      aria-label="Loading testimonials"
    >
      {[0, 1, 2].map((card) => (
        <div key={card} className="rounded-2xl border border-slate-100 p-5">
          <div className="flex justify-between">
            <div className="h-8 w-8 rounded-lg bg-slate-100" />
            <div className="h-6 w-14 rounded-full bg-slate-100" />
          </div>
          <div className="mt-4 h-7 w-7 rounded bg-slate-100" />
          <div className="mt-3 h-3.5 w-24 rounded bg-slate-100" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-2/3 rounded bg-slate-100" />
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
            <div className="h-11 w-11 rounded-full bg-slate-100" />
            <div className="space-y-1.5">
              <div className="h-3 w-24 rounded bg-slate-100" />
              <div className="h-2.5 w-32 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
