import { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { Check, Info, ListChecks, Loader2, Save, Search, Tags, UserRound, X } from 'lucide-react';
import { buildProfileImageUrl } from '@/features/auth/index.js';
import {
  isProviderSuspended,
  saveProviderAssignments,
  suspendedProviderMessage,
} from '@/features/providerAssignment/index.js';
import { SERVICE_CATEGORY_STATUS, buildServiceCategoryIconUrl } from '@/features/serviceCategory/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import { Modal } from '@/components/common/modal/index.js';
import { ServiceCategoryIcon } from '@/pages/serviceCategories/components/index.js';

const UNGROUPED = 'Other';

const plural = (count, word) => `${count} ${count === 1 ? word : `${word.replace(/y$/, 'ie')}s`}`;

// One dialog for both "Assign Provider" (no `row` - pick the provider first)
// and "Manage" on a listing row (provider fixed). Step 2 is the same either
// way: tick every service category the provider should work in. Saving sends
// only the difference - new ticks are assigned, cleared ticks are removed.
export default function AssignCategoriesModal({ row = null, rows, categories, showVertical, onClose, onSaved }) {
  const dispatch = useDispatch();
  const isManaging = Boolean(row);

  const [providerId, setProviderId] = useState(row?.provider._id ?? '');
  const [providerSearch, setProviderSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const assignedIdsOf = (targetRow) => new Set((targetRow?.assignments ?? []).map((entry) => entry.category._id));
  const [selected, setSelected] = useState(() => assignedIdsOf(row));

  const activeRow = useMemo(() => rows.find((item) => item.provider._id === providerId) ?? null, [rows, providerId]);

  // categoryId -> assignmentId for what the chosen provider already has.
  const current = useMemo(
    () => new Map((activeRow?.assignments ?? []).map((entry) => [entry.category._id, entry.assignmentId])),
    [activeRow],
  );

  // categoryId -> full assignment entry (includes status, statusChangedBy, etc.)
  const assignmentByCategoryId = useMemo(
    () => new Map((activeRow?.assignments ?? []).map((entry) => [entry.category._id, entry])),
    [activeRow],
  );

  const statusCounts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    (activeRow?.assignments ?? []).forEach((a) => {
      if (a.status === 'Pending') pending += 1;
      else if (a.status === 'Rejected') rejected += 1;
      else approved += 1;
    });
    return { approved, pending, rejected };
  }, [activeRow]);

  const pickProvider = (nextRow) => {
    // Suspended providers stay listed but can't be picked - say why instead.
    if (isProviderSuspended(nextRow.provider)) {
      toast.warning(suspendedProviderMessage(nextRow.provider), { id: `suspended-${nextRow.provider._id}` });
      return;
    }
    setProviderId(nextRow.provider._id);
    setSelected(assignedIdsOf(nextRow));
  };

  const toggleCategory = (categoryId) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });

  const providerQuery = providerSearch.trim().toLowerCase();
  const providerOptions = useMemo(
    () =>
      rows.filter(({ provider }) =>
        !providerQuery
          ? true
          : [provider.fullName, provider.email, provider.phone].some((text) => text?.toLowerCase().includes(providerQuery)),
      ),
    [rows, providerQuery],
  );

  // Categories grouped under their vertical for the Super Admin; one flat
  // group for an Admin, whose categories all sit in their own vertical.
  const categoryQuery = categorySearch.trim().toLowerCase();
  const categoryGroups = useMemo(() => {
    const groups = new Map();
    categories
      .filter((category) => !categoryQuery || category.name?.toLowerCase().includes(categoryQuery))
      .forEach((category) => {
        const label = showVertical
          ? category.vertical_data?.display_name || category.vertical_data?.name || UNGROUPED
          : '';
        groups.set(label, [...(groups.get(label) ?? []), category]);
      });
    return [...groups.entries()];
  }, [categories, categoryQuery, showVertical]);

  // Only categories in the catalogue can be ticked, so only those are diffed -
  // an assignment to a since-deleted category is left alone here.
  const catalogueIds = useMemo(() => new Set(categories.map((category) => category._id)), [categories]);
  const addCategoryIds = [...selected].filter((id) => !current.has(id));
  const removeAssignmentIds = [...current]
    .filter(([categoryId]) => catalogueIds.has(categoryId) && !selected.has(categoryId))
    .map(([, assignmentId]) => assignmentId);
  const hasChanges = addCategoryIds.length + removeAssignmentIds.length > 0;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await dispatch(saveProviderAssignments({ providerId, addCategoryIds, removeAssignmentIds })).unwrap();
      const parts = [
        result.added && `${plural(result.added, 'category')} assigned`,
        result.removed && `${plural(result.removed, 'category')} removed`,
      ].filter(Boolean);
      toast.success(`${activeRow.provider.fullName}: ${parts.join(', ')}`, {
        description: result.failed ? `${plural(result.failed, 'change')} could not be saved.` : undefined,
      });
      onSaved();
    } catch {
      // Already surfaced globally by lib/httpClient.js's response interceptor.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={isManaging ? 'Manage Categories' : 'Assign Provider'}
      description={
        isManaging
          ? `Choose the service categories ${row.provider.fullName} works in.`
          : 'Pick a provider, then tick the service categories they should work in.'
      }
      icon={ListChecks}
      size="lg"
      busy={isSaving}
      onClose={onClose}
      footer={
        <>
          <span className="sm:mr-auto self-center text-xs text-center sm:text-left" aria-live="polite">
            {!providerId ? (
              <span className="text-slate-400">Pick a provider to begin</span>
            ) : hasChanges ? (
              <span className="font-medium text-slate-600">
                {addCategoryIds.length > 0 && <span className="text-teal-700">+{addCategoryIds.length} to assign</span>}
                {addCategoryIds.length > 0 && removeAssignmentIds.length > 0 && <span className="text-slate-300"> · </span>}
                {removeAssignmentIds.length > 0 && (
                  <span className="text-rose-600">−{removeAssignmentIds.length} to remove</span>
                )}
              </span>
            ) : (
              <span className="text-slate-400">Tick or untick a category to enable saving</span>
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !providerId || !hasChanges}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Assignments
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Step 1 - provider */}
        <fieldset>
          <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {isManaging ? 'Provider' : '1. Provider'}
          </legend>

          {isManaging ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <Avatar
                src={buildProfileImageUrl(row.provider)}
                name={row.provider.fullName}
                className="h-10 w-10 text-sm ring-2 ring-white shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 truncate">{row.provider.fullName}</p>
                <p className="text-xs text-slate-400 truncate">{row.provider.email}</p>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <Callout icon={UserRound}>There are no providers to assign yet.</Callout>
          ) : (
            <>
              <SearchBox
                value={providerSearch}
                onChange={setProviderSearch}
                placeholder="Search providers by name, email or phone"
                label="Search providers"
              />
              <ul
                role="radiogroup"
                aria-label="Provider"
                className="mt-2.5 max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-1.5"
              >
                {providerOptions.length === 0 ? (
                  <li className="px-3 py-6 text-center text-xs text-slate-400">No providers match “{providerSearch.trim()}”.</li>
                ) : (
                  providerOptions.map((option) => (
                    <li key={option.provider._id}>
                      <ProviderOption
                        row={option}
                        checked={option.provider._id === providerId}
                        onPick={() => pickProvider(option)}
                      />
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </fieldset>

        {/* Step 2 - categories */}
        <fieldset>
          <legend className="mb-3 flex w-full items-baseline justify-between gap-3 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {isManaging ? 'Service categories' : '2. Service categories'}
            </span>
            {providerId && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {selected.size} selected
                </span>
                {statusCounts.approved > 0 && (
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {statusCounts.approved} live
                  </span>
                )}
                {statusCounts.pending > 0 && (
                  <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                    {statusCounts.pending} pending
                  </span>
                )}
                {statusCounts.rejected > 0 && (
                  <span className="font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {statusCounts.rejected} disabled
                  </span>
                )}
              </div>
            )}
          </legend>

          {categories.length === 0 ? (
            <Callout icon={Tags}>No service categories exist yet. Create one under Category Management first.</Callout>
          ) : !providerId ? (
            <Callout icon={Info}>Pick a provider above to see and change their categories.</Callout>
          ) : (
            <>
              <SearchBox
                value={categorySearch}
                onChange={setCategorySearch}
                placeholder="Search categories"
                label="Search categories"
              />
              {categoryGroups.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-400">No categories match “{categorySearch.trim()}”.</p>
              ) : (
                <div className="mt-3 space-y-4">
                  {categoryGroups.map(([label, groupCategories]) => (
                    <div key={label || 'all'}>
                      {label && <p className="mb-2 text-xs font-semibold text-slate-500">{label}</p>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="group" aria-label={label || 'Service categories'}>
                        {groupCategories.map((category) => (
                          <CategoryCheckbox
                            key={category._id}
                            category={category}
                            checked={selected.has(category._id)}
                            assignment={assignmentByCategoryId.get(category._id)}
                            onToggle={() => toggleCategory(category._id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </fieldset>
      </div>
    </Modal>
  );
}

function SearchBox({ value, onChange, placeholder, label }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="input-field bg-slate-50 pl-10 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// A single-select provider row (radio semantics).
function ProviderOption({ row, checked, onPick }) {
  const { provider, assignments } = row;
  const suspended = isProviderSuspended(provider);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-disabled={suspended}
      title={suspended ? 'Provider is suspended' : undefined}
      onClick={onPick}
      className={`flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition-all min-[420px]:gap-3 min-[420px]:p-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
        suspended
          ? 'border-transparent opacity-60 cursor-not-allowed'
          : checked
            ? 'border-teal-500 bg-white ring-2 ring-teal-500/20'
            : 'border-transparent hover:border-slate-200 hover:bg-white'
      }`}
    >
      <Avatar src={buildProfileImageUrl(provider)} name={provider.fullName} className="h-9 w-9 text-xs" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800 truncate">{provider.fullName}</span>
        <span className="block text-xs text-slate-400 truncate">{provider.email}</span>
        <span className="block text-[11px] font-semibold text-slate-500 truncate min-[420px]:hidden">
          {assignments.length > 0 ? plural(assignments.length, 'category') : 'Unassigned'}
        </span>
      </span>
      <span
        className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold min-[420px]:inline-block ${
          suspended
            ? 'bg-amber-50 text-amber-700'
            : assignments.length > 0
              ? 'bg-teal-50 text-teal-700'
              : 'bg-slate-100 text-slate-500'
        }`}
      >
        {suspended ? 'Suspended' : assignments.length > 0 ? plural(assignments.length, 'category') : 'Unassigned'}
      </span>
      <span
        className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
          checked ? 'border-teal-500 bg-teal-500' : 'border-slate-300 bg-white'
        }`}
        aria-hidden="true"
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
    </button>
  );
}

// A multi-select category card (checkbox semantics). The small tag shows what
// saving will do to it: "New" for a fresh tick, "Removing" for a cleared one.
function CategoryCheckbox({ category, checked, assignment, onToggle }) {
  const isInactive = category.status === SERVICE_CATEGORY_STATUS.INACTIVE;
  const wasAssigned = Boolean(assignment);
  const status = assignment?.status || 'Approved';
  const isApproved = wasAssigned && status === 'Approved';
  const isPending = wasAssigned && status === 'Pending';
  const isRejected = wasAssigned && status === 'Rejected';

  const change = checked && !wasAssigned ? 'new' : !checked && wasAssigned ? 'removing' : null;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={`group relative flex min-w-0 items-center gap-3 rounded-xl border p-2.5 sm:p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
        change === 'removing'
          ? 'border-rose-300 bg-rose-50/50 ring-1 ring-rose-400/20'
          : change === 'new'
          ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20'
          : checked && isApproved
          ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-500/20 hover:border-emerald-400'
          : checked && isPending
          ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-400/20 hover:border-amber-400'
          : checked && isRejected
          ? 'border-slate-300 bg-slate-50/80 hover:border-slate-400'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
      }`}
    >
      <ServiceCategoryIcon src={buildServiceCategoryIconUrl(category)} className="w-9 h-9 rounded-lg" glyphSize={18} />
      <div className="min-w-0 flex-1">
        <span
          className={`block text-sm font-semibold truncate ${
            isRejected && !change ? 'line-through text-slate-400' : isApproved && checked && !change ? 'text-emerald-950 font-semibold' : 'text-slate-800'
          }`}
        >
          {category.name}
        </span>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs">
          {change === 'new' && (
            <span className="inline-flex items-center gap-1 rounded-md bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
              + Will Assign & Approve
            </span>
          )}
          {change === 'removing' && (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
              ✕ Will Remove
            </span>
          )}
          {!change && isApproved && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
              ● Live / Approved
            </span>
          )}
          {!change && isPending && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
              ● Pending Review
            </span>
          )}
          {!change && isRejected && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              ● Disabled (Rejected)
            </span>
          )}
          {!change && !wasAssigned && (
            <span className="text-slate-400 text-[11px]">
              {isInactive ? 'Inactive in catalogue' : 'Not assigned'}
            </span>
          )}
        </div>
      </div>
      <span
        className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center text-white transition-colors ${
          change === 'removing'
            ? 'border-rose-500 bg-rose-500'
            : change === 'new'
            ? 'border-teal-500 bg-teal-500'
            : checked && isApproved
            ? 'border-emerald-500 bg-emerald-500'
            : checked && isPending
            ? 'border-amber-500 bg-amber-500'
            : checked && isRejected
            ? 'border-slate-400 bg-slate-400'
            : 'border-slate-300 bg-white group-hover:border-slate-400'
        }`}
        aria-hidden="true"
      >
        <Check size={12} strokeWidth={3} />
      </span>
    </button>
  );
}

function Callout({ icon: Icon, children }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">
      <Icon size={14} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}
