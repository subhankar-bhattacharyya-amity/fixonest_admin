import { Eye, PauseCircle, PencilLine, PlayCircle, Trash2 } from 'lucide-react';
import { SERVICE_STATUS } from '@/features/service/index.js';
import {
  FeaturedToggle,
  ServiceCategoryChip,
  ServicePriceTag,
  ServiceRating,
  ServiceStatusPill,
  ServiceThumb,
} from './ServiceBadges.jsx';
import { IconAction } from './ServiceGrid.jsx';

// Services as a compact table from `xl` up, and as stacked rows below it.
// Purely presentational - the page owns data loading, filters and dialogs.
export default function ServiceTable({ services, startIndex = 0, isLoading, featuredBlocked, pendingFeaturedId, ...actions }) {
  if (isLoading && services.length === 0) return <TableSkeleton />;

  const featured = (service) => ({
    service,
    pending: pendingFeaturedId === service._id,
    blocked: featuredBlocked,
    disabled: Boolean(pendingFeaturedId),
    onToggle: actions.onToggleFeatured,
  });

  return (
    <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-60' : ''}`}>
      {/* Desktop */}
      <div className="hidden xl:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th scope="col" className="w-14 px-6 py-3.5">#</th>
              <th scope="col" className="px-6 py-3.5">Service</th>
              <th scope="col" className="px-6 py-3.5">Category</th>
              <th scope="col" className="px-6 py-3.5">Price</th>
              <th scope="col" className="px-6 py-3.5">Rating</th>
              <th scope="col" className="px-6 py-3.5">Featured</th>
              <th scope="col" className="px-6 py-3.5">Status</th>
              <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {services.map((service, index) => (
              <tr
                key={service._id}
                className="group hover:bg-teal-50/30 transition-colors animate-rise-in"
                style={{ animationDelay: `${Math.min(index, 11) * 30}ms` }}
              >
                <td className="px-6 py-4 text-slate-400 font-medium tabular-nums">{startIndex + index + 1}</td>
                <td className="px-6 py-4 max-w-sm">
                  <ServiceIdentity service={service} onView={actions.onView} />
                </td>
                <td className="px-6 py-4">
                  <ServiceCategoryChip name={service.category_data?.name} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <ServicePriceTag price={service.price} discountPrice={service.discountPrice} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <ServiceRating rating={service.rating} reviewCount={service.reviewCount} />
                </td>
                <td className="px-6 py-4">
                  <FeaturedToggle {...featured(service)} />
                </td>
                <td className="px-6 py-4">
                  <ServiceStatusPill status={service.status} />
                </td>
                <td className="px-6 py-4">
                  <RowActions service={service} {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet / small laptop */}
      <ul className="xl:hidden divide-y divide-slate-100">
        {services.map((service, index) => (
          <li key={service._id} className="p-4 animate-rise-in" style={{ animationDelay: `${Math.min(index, 11) * 30}ms` }}>
            <ServiceIdentity service={service} onView={actions.onView} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ServiceStatusPill status={service.status} />
              <ServiceCategoryChip name={service.category_data?.name} />
              <ServiceRating rating={service.rating} reviewCount={service.reviewCount} className="ml-1" />
            </div>
            <div className="mt-3">
              <ServicePriceTag price={service.price} discountPrice={service.discountPrice} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-slate-100 pt-3">
              <FeaturedToggle {...featured(service)} />
              <RowActions service={service} {...actions} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServiceIdentity({ service, onView }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <ServiceThumb path={service.image_url} />
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onView(service)}
          title={service.name}
          className="block max-w-full text-left font-semibold text-slate-800 line-clamp-2 hover:text-teal-700 transition-colors focus:outline-none focus-visible:underline"
        >
          {service.name}
        </button>
      </div>
    </div>
  );
}

function RowActions({ service, onView, onEdit, onToggleStatus, onDelete }) {
  const isInactive = service.status === SERVICE_STATUS.INACTIVE;
  const StatusIcon = isInactive ? PlayCircle : PauseCircle;
  return (
    <div className="flex items-center justify-end gap-0.5 shrink-0">
      <IconAction label={`View ${service.name}`} title="View" tone="teal" onClick={() => onView(service)}>
        <Eye size={17} />
      </IconAction>
      <IconAction label={`Edit ${service.name}`} title="Edit" tone="teal" onClick={() => onEdit(service)}>
        <PencilLine size={17} />
      </IconAction>
      <IconAction
        label={`${isInactive ? 'Activate' : 'Deactivate'} ${service.name}`}
        title={isInactive ? 'Activate' : 'Deactivate'}
        tone={isInactive ? 'emerald' : 'amber'}
        onClick={() => onToggleStatus(service)}
      >
        <StatusIcon size={17} />
      </IconAction>
      <IconAction label={`Delete ${service.name}`} title="Delete" tone="rose" onClick={() => onDelete(service)}>
        <Trash2 size={17} />
      </IconAction>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-100 animate-pulse" aria-label="Loading services">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 xl:px-6 py-4">
          <div className="w-16 h-12 rounded-xl bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-56 max-w-full rounded bg-slate-100" />
            <div className="h-3 w-28 max-w-full rounded bg-slate-100" />
          </div>
          <div className="hidden xl:block h-6 w-24 rounded-full bg-slate-100" />
          <div className="hidden sm:block h-6 w-20 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
