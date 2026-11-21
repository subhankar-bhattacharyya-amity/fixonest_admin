import { ImageOff, Loader2, Star } from 'lucide-react';
import { buildServiceImageUrl, formatServicePrice, getServicePricing, getServiceStatus } from '@/features/service/index.js';

// Small building blocks shared by the grid, the table, the details dialog and
// the editor's preview, so a service looks the same everywhere in the panel.

export function ServiceStatusPill({ status, className = '' }) {
  const { label, badge, dot } = getServiceStatus(status);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export function ServiceCategoryChip({ name, className = '' }) {
  if (!name) return <span className="text-xs italic text-slate-400">No category</span>;
  return (
    <span
      className={`inline-flex max-w-44 items-center rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/10 ${className}`}
    >
      <span className="truncate">{name}</span>
    </span>
  );
}

// "₹349 ₹449 22% off" - the price a customer pays, then the struck-through
// full price and the saving when there is a discount.
export function ServicePriceTag({ price, discountPrice, size = 'md' }) {
  const { finalPrice, originalPrice, percentOff } = getServicePricing({ price, discountPrice });
  const big = size === 'lg';
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`font-bold text-slate-800 tabular-nums ${big ? 'text-2xl' : 'text-base'}`}>
        {formatServicePrice(finalPrice)}
      </span>
      {originalPrice !== null && (
        <>
          <span className={`text-slate-400 line-through tabular-nums ${big ? 'text-sm' : 'text-xs'}`}>
            {formatServicePrice(originalPrice)}
          </span>
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            {percentOff}% off
          </span>
        </>
      )}
    </span>
  );
}

export function ServiceRating({ rating, reviewCount, className = '' }) {
  const value = Number(rating) || 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs text-slate-500 ${className}`}>
      <Star size={13} className={value > 0 ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'} />
      <span className="font-semibold text-slate-700 tabular-nums">{value > 0 ? value.toFixed(1) : '—'}</span>
      {reviewCount > 0 && <span className="tabular-nums">({Number(reviewCount).toLocaleString('en-IN')})</span>}
    </span>
  );
}

// The cover thumbnail, with a neutral placeholder when there is none.
export function ServiceThumb({ path, className = 'w-16 h-12', rounded = 'rounded-xl' }) {
  const url = buildServiceImageUrl(path);
  if (!url) {
    return (
      <span
        className={`${className} ${rounded} shrink-0 bg-slate-50 text-slate-300 ring-1 ring-slate-200 flex items-center justify-center`}
        title="No cover image"
      >
        <ImageOff size={18} />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      className={`${className} ${rounded} shrink-0 object-cover bg-slate-100 ring-1 ring-slate-200`}
    />
  );
}

// A star switch that puts a service on (or takes it off) the customer site's
// Home "Featured services". `blocked` = every featured slot is taken.
export function FeaturedToggle({ service, pending, blocked, disabled, onToggle, variant = 'chip' }) {
  const isOn = Boolean(service.isFeatured);
  const cannotTurnOn = blocked && !isOn;
  const title = isOn
    ? 'Remove from featured'
    : cannotTurnOn
      ? 'All featured slots are taken - remove one first'
      : 'Feature on the Home page';

  if (variant === 'icon') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={`Featured: ${service.name}`}
        title={title}
        disabled={disabled}
        onClick={() => onToggle(service)}
        className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed ${
          isOn ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-white/90 text-slate-400 hover:text-amber-500'
        } ${cannotTurnOn ? 'opacity-70' : ''}`}
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} className={isOn ? 'fill-white' : ''} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={`Featured: ${service.name}`}
      title={title}
      disabled={disabled}
      onClick={() => onToggle(service)}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed ${
        isOn
          ? 'bg-amber-50 text-amber-700 ring-amber-500/25 hover:bg-amber-100'
          : 'bg-white text-slate-400 ring-slate-200 hover:text-slate-600 hover:ring-slate-300'
      } ${cannotTurnOn ? 'opacity-60' : ''}`}
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} className={isOn ? 'fill-amber-400 text-amber-500' : ''} />}
      {isOn ? 'Featured' : 'Feature'}
    </button>
  );
}
