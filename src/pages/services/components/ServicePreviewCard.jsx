import { Clock3, EyeOff, ImageIcon, Star } from 'lucide-react';
import { formatServicePrice, getServicePricing } from '@/features/service/index.js';

// A live preview of the card customers see in the Services listing and the
// Home "Featured services" section, updated as the form is filled in. It
// follows the customer card's layout (image with a category chip, name with
// the rating, "Starting from" price) in the panel's own colours.
export default function ServicePreviewCard({
  name,
  categoryName,
  coverUrl,
  price,
  discountPrice,
  rating,
  reviewCount,
  durationText,
  isFeatured,
  isInactive,
}) {
  const { finalPrice, originalPrice, percentOff } = getServicePricing({ price, discountPrice });
  const ratingValue = Number(rating) || 0;

  return (
    <div className="relative">
      <div
        className={`overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg shadow-slate-200/60 transition-opacity ${
          isInactive ? 'opacity-60' : ''
        }`}
      >
        <div className="relative h-44 overflow-hidden bg-linear-to-br from-slate-50 to-teal-50/70">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 text-slate-300">
              <ImageIcon size={30} />
              <span className="text-[11px] font-medium text-slate-400">Cover image</span>
            </div>
          )}
          <span className="absolute left-4 top-4 max-w-[70%] truncate rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {categoryName || 'Category'}
          </span>
          {isFeatured && (
            <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
              <Star size={11} className="fill-white" />
              Featured
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h4 className={`line-clamp-2 text-base font-semibold ${name ? 'text-slate-900' : 'text-slate-300'}`}>
              {name || 'Service name'}
            </h4>
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-600">
              <Star size={14} className={ratingValue > 0 ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'} />
              {ratingValue > 0 ? ratingValue.toFixed(1) : '—'}
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500">Starting from</p>
              <p className="mt-0.5 flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900 tabular-nums">{formatServicePrice(finalPrice)}</span>
                {originalPrice !== null && (
                  <span className="text-sm text-slate-400 line-through tabular-nums">{formatServicePrice(originalPrice)}</span>
                )}
              </p>
            </div>
            <span className="rounded-full bg-linear-to-r from-teal-500 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-teal-500/25">
              Book Now
            </span>
          </div>
        </div>
      </div>

      {/* What the details page adds on top of the card */}
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <PreviewFact icon={Clock3} label="Duration" value={durationText} />
        <PreviewFact icon={Star} label="Reviews" value={reviewCount > 0 ? Number(reviewCount).toLocaleString('en-IN') : ''} />
        <PreviewFact label="Saving" value={percentOff ? `${percentOff}% off` : ''} highlight />
      </dl>

      {isInactive && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
          <EyeOff size={14} />
          Inactive - customers won't see this service.
        </p>
      )}
    </div>
  );
}

function PreviewFact({ icon: Icon, label, value, highlight = false }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd
        className={`mt-0.5 flex items-center gap-1 truncate font-semibold ${
          value ? (highlight ? 'text-emerald-600' : 'text-slate-700') : 'font-normal text-slate-300'
        }`}
      >
        {Icon && value && <Icon size={12} className="shrink-0 text-teal-600" />}
        <span className="truncate">{value || 'Not set'}</span>
      </dd>
    </div>
  );
}
