import { useState } from 'react';
import { Eye, EyeOff, ImageOff, Loader2, MessageSquareDashed, PencilLine, Quote, Trash2 } from 'lucide-react';
import Avatar from '@/components/common/avatar/Avatar.jsx';
import {
  SERVICE_REVIEW_STATUS,
  buildCustomerAvatarUrl,
  buildServiceThumbUrl,
  formatReviewAge,
} from '@/features/serviceReview/index.js';
import { formatDate } from '@/utils/formatDate.js';
import { StarDisplay } from './ReviewStars.jsx';

// The reviews as cards - who wrote it, for which service, the stars, the
// date and the text. Purely presentational: the page owns data and dialogs.
// `now` is passed in so relative dates stay consistent across one render.
export default function ReviewList({ reviews, isLoading, now, pendingStatusId, onEdit, onToggleStatus, onDelete, onPickService }) {
  if (isLoading && reviews.length === 0) return <ListSkeleton />;

  return (
    <ul
      className={`grid grid-cols-1 gap-4 p-4 sm:p-6 2xl:grid-cols-2 transition-opacity duration-200 ${isLoading ? 'opacity-60' : ''}`}
    >
      {reviews.map((review, index) => (
        <li key={review._id} className="animate-rise-in" style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}>
          <ReviewCard
            review={review}
            now={now}
            isPending={pendingStatusId === review._id}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
            onPickService={onPickService}
          />
        </li>
      ))}
    </ul>
  );
}

function ReviewCard({ review, now, isPending, onEdit, onToggleStatus, onDelete, onPickService }) {
  const [expanded, setExpanded] = useState(false);
  const isHidden = review.status === SERVICE_REVIEW_STATUS.HIDDEN;
  const isLong = review.comment.length > 220;
  const thumb = buildServiceThumbUrl(review.service?.image_url);
  const customerName = review.customer?.fullName ?? 'Deleted customer';

  return (
    <article
      className={`group relative flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md ${
        isHidden ? 'border-dashed border-slate-200 bg-slate-50/60' : 'border-slate-100 hover:border-teal-100'
      }`}
    >
      {/* Who and when */}
      <header className="flex items-start gap-3">
        <Avatar
          src={buildCustomerAvatarUrl(review.customer?.profile_image)}
          name={customerName}
          className={`h-11 w-11 text-sm ring-2 ring-white shadow-sm ${isHidden ? 'opacity-60' : ''}`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-800">{customerName}</p>
          <p className="truncate text-xs text-slate-400">{review.customer?.email}</p>
        </div>
        <div className="shrink-0 text-right">
          <StarDisplay value={review.rating} size={15} />
          <p className="mt-1 text-[11px] text-slate-400" title={formatDate(new Date(review.reviewedAt))}>
            {formatReviewAge(review.reviewedAt, now)}
          </p>
        </div>
      </header>

      {/* What they said */}
      <div className={`mt-4 flex-1 ${isHidden ? 'opacity-70' : ''}`}>
        {review.hasComment ? (
          <div className="relative rounded-xl bg-slate-50/80 px-4 py-3">
            <Quote size={16} className="absolute -left-1.5 -top-2 rotate-180 fill-teal-100 text-teal-300" aria-hidden="true" />
            <p className={`text-sm leading-relaxed text-slate-600 whitespace-pre-line ${expanded ? '' : 'line-clamp-4'}`}>
              {review.comment}
            </p>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((open) => !open)}
                className="mt-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-400">
            <MessageSquareDashed size={15} />
            Rating only - no written review
          </p>
        )}
      </div>

      {/* For which service */}
      <button
        type="button"
        onClick={() => review.service && onPickService(review.service)}
        title={review.service ? `Show only reviews of ${review.service.name}` : undefined}
        className="mt-4 flex min-w-0 items-center gap-2.5 rounded-xl px-1 py-1 text-left hover:bg-teal-50/60 transition-colors"
      >
        {thumb ? (
          <img src={thumb} alt="" className="h-9 w-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
        ) : (
          <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-300 ring-1 ring-slate-200">
            <ImageOff size={14} />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-700">{review.service?.name ?? 'Deleted service'}</span>
          <span className="block truncate text-[11px] text-slate-400">{review.category?.name}</span>
        </span>
      </button>

      {/* Visibility and actions */}
      <footer className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
            isHidden ? 'bg-slate-100 text-slate-600 ring-slate-500/15' : 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isHidden ? 'bg-slate-400' : 'bg-emerald-500'}`} aria-hidden="true" />
          {isHidden ? 'Hidden' : 'Visible'}
        </span>
        <div className="flex items-center gap-0.5">
          <IconButton label={`Edit review by ${customerName}`} title="Edit" tone="teal" onClick={() => onEdit(review)}>
            <PencilLine size={16} />
          </IconButton>
          <IconButton
            label={`${isHidden ? 'Show' : 'Hide'} review by ${customerName}`}
            title={isHidden ? 'Show on the customer site' : 'Hide from the customer site'}
            tone={isHidden ? 'emerald' : 'amber'}
            disabled={isPending}
            onClick={() => onToggleStatus(review)}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </IconButton>
          <IconButton label={`Delete review by ${customerName}`} title="Delete" tone="rose" onClick={() => onDelete(review)}>
            <Trash2 size={16} />
          </IconButton>
        </div>
      </footer>
    </article>
  );
}

const TONES = {
  teal: 'hover:text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500/50',
  emerald: 'hover:text-emerald-600 hover:bg-emerald-50 focus-visible:ring-emerald-500/50',
  amber: 'hover:text-amber-600 hover:bg-amber-50 focus-visible:ring-amber-500/50',
  rose: 'hover:text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-500/50',
};

function IconButton({ label, title, tone, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title}
      className={`p-2 rounded-lg text-slate-500 transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-60 ${TONES[tone]}`}
    >
      {children}
    </button>
  );
}

function ListSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-4 p-4 sm:p-6 2xl:grid-cols-2 animate-pulse" aria-label="Loading reviews">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-32 rounded bg-slate-100" />
              <div className="h-3 w-44 rounded bg-slate-100" />
            </div>
            <div className="h-4 w-20 rounded bg-slate-100" />
          </div>
          <div className="mt-4 h-16 rounded-xl bg-slate-100" />
          <div className="mt-4 h-9 w-48 rounded-lg bg-slate-100" />
        </li>
      ))}
    </ul>
  );
}
