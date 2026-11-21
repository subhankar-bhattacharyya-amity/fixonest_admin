import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { buildServiceCategoryIconUrl } from '@/features/serviceCategory/index.js';
import { ServiceCategoryIcon } from '@/pages/serviceCategories/components/index.js';

// Dropdown with a search box and a tick list of service categories, plus the
// picked ones as removable chips underneath. `value` is an array of category
// ids; `onChange` receives the new array. Used by ProviderDetailsCard's
// "Areas of Experience".
export default function CategoryMultiSelect({
  id,
  categories,
  expertiseWithStatus = [],
  value,
  onChange,
  isLoading,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selected = useMemo(() => new Set(value), [value]);
  const byId = useMemo(() => new Map(categories.map((category) => [category._id, category])), [categories]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? categories.filter((category) => category.name.toLowerCase().includes(term)) : categories;
  }, [categories, search]);

  const toggle = (categoryId) =>
    onChange(selected.has(categoryId) ? value.filter((idValue) => idValue !== categoryId) : [...value, categoryId]);

  const summary = value.length
    ? `${value.length} ${value.length === 1 ? 'category' : 'categories'} selected`
    : 'Select service categories';

  return (
    <div ref={containerRef} className="relative space-y-2">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        className={`input-field bg-slate-50 flex items-center justify-between gap-2 text-left ${
          error ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/40' : ''
        }`}
      >
        <span className={value.length ? 'text-slate-700' : 'text-slate-400'}>{summary}</span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-12 z-20 rounded-xl border border-slate-100 bg-white shadow-lg shadow-slate-200/60">
          <div className="relative border-b border-slate-100 p-2">
            <Search size={15} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories"
              className="input-field bg-slate-50 pl-9 py-2 text-sm"
            />
          </div>
          <ul role="listbox" aria-multiselectable="true" className="max-h-64 overflow-y-auto p-1.5">
            {isLoading ? (
              <li className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin" /> Loading categories...
              </li>
            ) : visible.length === 0 ? (
              <li className="py-6 text-center text-sm text-slate-400">No categories found</li>
            ) : (
              visible.map((category) => {
                const isSelected = selected.has(category._id);
                return (
                  <li key={category._id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => toggle(category._id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                        isSelected ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <ServiceCategoryIcon
                        src={buildServiceCategoryIconUrl(category)}
                        className="w-8 h-8 rounded-lg"
                        glyphSize={15}
                      />
                      <span className="flex-1 truncate font-medium">{category.name}</span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isSelected ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check size={13} strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((categoryId) => {
            const category = byId.get(categoryId);
            if (!category) return null;
            const statusInfo = expertiseWithStatus.find(
              (item) => String(item._id) === String(categoryId) || String(item.assignmentId) === String(categoryId)
            );
            const status = statusInfo?.status || 'Pending';
            const isApproved = status === 'Approved';
            const isRejected = status === 'Rejected';
            const isPending = !isApproved && !isRejected;

            return (
              <span
                key={categoryId}
                title={
                  isApproved
                    ? 'Approved: visible to customers on Workers page'
                    : isRejected
                    ? 'Rejected by admin'
                    : 'Pending: waiting for admin approval'
                }
                className={`inline-flex items-center gap-1.5 rounded-lg py-1 pl-1.5 pr-2 text-xs font-semibold ring-1 ring-inset transition-all ${
                  isPending
                    ? 'bg-amber-50 text-amber-900 ring-amber-300/80 border border-amber-200 shadow-xs'
                    : isApproved
                    ? 'bg-emerald-50 text-emerald-900 ring-emerald-400/80 border border-emerald-300 shadow-xs'
                    : 'opacity-60 bg-slate-100 text-slate-400 ring-slate-200 border border-slate-200'
                }`}
              >
                <ServiceCategoryIcon
                  src={buildServiceCategoryIconUrl(category)}
                  className="w-5 h-5 rounded-md"
                  glyphSize={12}
                />
                <span className={isRejected ? 'line-through text-slate-400' : isApproved ? 'text-emerald-900 font-semibold' : ''}>
                  {category.name}
                </span>
                {isPending && (
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-200/90 text-amber-900">
                    Pending
                  </span>
                )}
                {isRejected && (
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-600">
                    Rejected
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => toggle(categoryId)}
                  aria-label={`Remove ${category.name}`}
                  className="rounded-md p-0.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors ml-0.5"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
