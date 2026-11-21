import { useState } from 'react';
import { Star } from 'lucide-react';
import { STAR_LABELS } from '@/features/serviceReview/index.js';

// Read-only stars, filled up to `value` - fractions too (4.4 fills 4 stars
// and 40% of the fifth).
export function StarDisplay({ value, size = 16, className = '' }) {
  const rating = Number(value) || 0;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, rating - (star - 1)));
        return (
          <span key={star} className="relative inline-flex">
            <Star size={size} className="fill-slate-200 text-slate-200" aria-hidden="true" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="fill-amber-400 text-amber-400" aria-hidden="true" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

// Five big stars to pick a rating: hover previews, click picks, arrow keys
// move the choice (it's a radio group), and the meaning ("Very good") shows
// beside them.
export function StarPicker({ value, onChange, disabled, invalid, id }) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value || 0;

  const handleKey = (event) => {
    if (disabled) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(Math.max(1, (value || 1) - 1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        id={id}
        role="radiogroup"
        aria-label="Rating"
        aria-invalid={invalid}
        onKeyDown={handleKey}
        onMouseLeave={() => setHovered(0)}
        className={`inline-flex items-center gap-1 rounded-xl px-1.5 py-1 ${invalid ? 'ring-2 ring-rose-300' : ''}`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isOn = star <= shown;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star > 1 ? 's' : ''} - ${STAR_LABELS[star]}`}
              tabIndex={value ? (value === star ? 0 : -1) : star === 1 ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              className="rounded-lg p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed"
            >
              <Star
                size={30}
                className={`transition-colors ${isOn ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-300'}`}
              />
            </button>
          );
        })}
      </div>
      <span
        className={`min-w-20 text-sm font-semibold ${shown ? 'text-amber-600' : 'text-slate-400'}`}
        aria-live="polite"
      >
        {shown ? STAR_LABELS[shown] : 'Tap a star'}
      </span>
    </div>
  );
}
