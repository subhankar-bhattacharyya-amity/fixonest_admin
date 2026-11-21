import { CalendarClock, Eye, Hash, MapPin, PencilLine, Quote, Wrench } from 'lucide-react';
import {
  TESTIMONIAL_STATUS,
  RATING_LABELS,
  getTestimonialStatus,
  buildTestimonialAvatarUrl,
} from '@/features/testimonial/index.js';
import { Modal } from '@/components/common/modal/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import { formatDateTime } from '@/utils/formatDate.js';
import RatingStars from './RatingStars.jsx';

// Read-only view of one testimonial, from its listing card, with a shortcut to edit it.
export default function TestimonialDetailsModal({ testimonial, position, onClose, onEdit }) {
  const status = getTestimonialStatus(testimonial.status);
  const StatusIcon = status.icon;

  const meta = [
    { label: 'Position', value: `#${position} in the Home page carousel`, icon: Hash },
    {
      label: 'Visibility',
      value: testimonial.status === TESTIMONIAL_STATUS.INACTIVE ? 'Hidden from the website' : 'Live on the website',
      icon: StatusIcon,
    },
    { label: 'Created', value: formatDateTime(testimonial.createdAt), icon: CalendarClock },
    { label: 'Last updated', value: formatDateTime(testimonial.updatedAt ?? testimonial.createdAt), icon: CalendarClock },
  ];

  return (
    <Modal
      title="Testimonial Details"
      description="A customer review on the Home page."
      icon={Eye}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onEdit(testimonial)}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 font-medium"
          >
            <PencilLine size={18} />
            Edit Testimonial
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Customer */}
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-linear-to-br from-slate-50 to-teal-50/50 p-5 text-center ring-1 ring-slate-100 sm:flex-row sm:text-left">
          <Avatar
            src={buildTestimonialAvatarUrl(testimonial.avatar)}
            name={testimonial.name}
            alt={`${testimonial.name}'s photo`}
            className="h-20 w-20 text-xl ring-4 ring-white shadow-md shadow-slate-300/60"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-800">{testimonial.name}</h3>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-500 sm:justify-start">
              {testimonial.service && (
                <span className="inline-flex items-center gap-1">
                  <Wrench size={12} aria-hidden="true" />
                  {testimonial.service}
                </span>
              )}
              {testimonial.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} aria-hidden="true" />
                  {testimonial.location}
                </span>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <RatingStars rating={testimonial.rating} size={16} />
              <span className="text-xs font-semibold text-amber-700">{RATING_LABELS[testimonial.rating]}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* Review */}
        <figure className="relative rounded-xl bg-white px-5 py-4 ring-1 ring-slate-100">
          <Quote size={34} className="absolute -top-3 left-4 rounded-lg bg-white px-1 text-teal-200" aria-hidden="true" />
          <blockquote className="pt-2 text-[15px] leading-relaxed text-slate-600 whitespace-pre-line">
            “{testimonial.quote}”
          </blockquote>
        </figure>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {meta.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <item.icon size={16} />
              </span>
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{item.label}</dt>
                <dd className="text-sm font-medium text-slate-700 truncate">{item.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  );
}
