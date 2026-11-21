import { Eye, PauseCircle, PencilLine, PlayCircle, Trash2 } from 'lucide-react';
import { buildServiceImageUrl, SERVICE_STATUS } from '@/features/service/index.js';
import { FeaturedToggle, ServicePriceTag, ServiceRating, ServiceStatusPill } from './ServiceBadges.jsx';

// Services as cards - the same shape customers see, so the admin recognises a
// service at a glance. Purely presentational: the page owns data and dialogs.
export default function ServiceGrid({ services, isLoading, featuredBlocked, pendingFeaturedId, ...actions }) {
  if (isLoading && services.length === 0) return <GridSkeleton />;

  return (
    <ul
      className={`grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-6 lg:grid-cols-3 2xl:grid-cols-4 transition-opacity duration-200 ${
        isLoading ? 'opacity-60' : ''
      }`}
    >
      {services.map((service, index) => (
        <li key={service._id} className="animate-rise-in" style={{ animationDelay: `${Math.min(index, 11) * 40}ms` }}>
          <ServiceCard
            service={service}
            featuredBlocked={featuredBlocked}
            pendingFeatured={pendingFeaturedId === service._id}
            featuredDisabled={Boolean(pendingFeaturedId)}
            {...actions}
          />
        </li>
      ))}
    </ul>
  );
}

function ServiceCard({
  service,
  featuredBlocked,
  pendingFeatured,
  featuredDisabled,
  onView,
  onEdit,
  onToggleFeatured,
  onToggleStatus,
  onDelete,
}) {
  const coverUrl = buildServiceImageUrl(service.image_url);
  const isInactive = service.status === SERVICE_STATUS.INACTIVE;
  const StatusIcon = isInactive ? PlayCircle : PauseCircle;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-100 hover:shadow-lg hover:shadow-slate-200/70">
      <div className="relative aspect-16/10 overflow-hidden bg-linear-to-br from-slate-50 to-teal-50/60">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              isInactive ? 'grayscale opacity-70' : ''
            }`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400">No cover image</div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-slate-900/40 to-transparent" />

        <ServiceStatusPill status={service.status} className="absolute left-3 top-3 bg-white/95 shadow-sm" />
        <div className="absolute right-3 top-3">
          <FeaturedToggle
            variant="icon"
            service={service}
            pending={pendingFeatured}
            blocked={featuredBlocked}
            disabled={featuredDisabled}
            onToggle={onToggleFeatured}
          />
        </div>
        <span className="absolute bottom-3 left-3 max-w-[75%] truncate rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
          {service.category_data?.name ?? 'No category'}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <button
          type="button"
          onClick={() => onView(service)}
          title={service.name}
          className="text-left font-semibold leading-snug text-slate-800 line-clamp-2 hover:text-teal-700 transition-colors focus:outline-none focus-visible:underline"
        >
          {service.name}
        </button>
        {service.description && <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">{service.description}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <ServiceRating rating={service.rating} reviewCount={service.reviewCount} />
        </div>

        <div className="mt-auto pt-4">
          <ServicePriceTag price={service.price} discountPrice={service.discountPrice} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
        <button
          type="button"
          onClick={() => onView(service)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
        >
          <Eye size={15} />
          View
        </button>
        <div className="flex items-center gap-0.5">
          <IconAction label={`Edit ${service.name}`} title="Edit" tone="teal" onClick={() => onEdit(service)}>
            <PencilLine size={16} />
          </IconAction>
          <IconAction
            label={`${isInactive ? 'Activate' : 'Deactivate'} ${service.name}`}
            title={isInactive ? 'Activate' : 'Deactivate'}
            tone={isInactive ? 'emerald' : 'amber'}
            onClick={() => onToggleStatus(service)}
          >
            <StatusIcon size={16} />
          </IconAction>
          <IconAction label={`Delete ${service.name}`} title="Delete" tone="rose" onClick={() => onDelete(service)}>
            <Trash2 size={16} />
          </IconAction>
        </div>
      </div>
    </article>
  );
}

const ICON_TONES = {
  teal: 'hover:text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500/50',
  emerald: 'hover:text-emerald-600 hover:bg-emerald-50 focus-visible:ring-emerald-500/50',
  amber: 'hover:text-amber-600 hover:bg-amber-50 focus-visible:ring-amber-500/50',
  rose: 'hover:text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-500/50',
};

export function IconAction({ label, title, tone, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      className={`p-2 rounded-lg text-slate-500 transition-colors focus:outline-none focus-visible:ring-2 ${ICON_TONES[tone]}`}
    >
      {children}
    </button>
  );
}

function GridSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-6 lg:grid-cols-3 2xl:grid-cols-4 animate-pulse" aria-label="Loading services">
      {Array.from({ length: 8 }, (_, index) => (
        <li key={index} className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <div className="aspect-16/10 bg-slate-100" />
          <div className="space-y-2.5 p-4">
            <div className="h-4 w-3/4 rounded bg-slate-100" />
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-1/2 rounded bg-slate-100" />
            <div className="h-5 w-24 rounded bg-slate-100 mt-4" />
          </div>
          <div className="h-11 border-t border-slate-100" />
        </li>
      ))}
    </ul>
  );
}
