import { ArrowLeft, ArrowRight, Eye, PauseCircle, PencilLine, PlayCircle, Trash2 } from 'lucide-react';
import {
  TEAM_MEMBER_STATUS,
  getTeamMemberStatus,
  buildTeamMemberAvatarUrl,
  shortLinkedinLabel,
} from '@/features/teamMember/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import LinkedinIcon from './LinkedinIcon.jsx';

// The team in About page order, as profile cards shaped like the ones in the
// customer site's "Meet the team" section, so the Super Admin sees what
// customers see. Purely presentational - the page owns loading, filters,
// reordering and dialogs. `canReorder` is false while a search or filter
// hides some cards, because "move earlier" would then be ambiguous.
export default function TeamMemberGrid({
  members,
  isLoading,
  canReorder,
  reorderBusy,
  onMove,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}) {
  if (isLoading && members.length === 0) return <GridSkeleton />;

  const actions = { onView, onEdit, onToggleStatus, onDelete };

  return (
    <ol
      className={`grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-6 lg:grid-cols-3 2xl:grid-cols-4 transition-opacity duration-200 ${
        isLoading ? 'opacity-60' : ''
      }`}
    >
      {members.map((member, index) => (
        <TeamMemberCard
          key={member._id}
          member={member}
          index={index}
          reorder={
            canReorder && {
              busy: reorderBusy,
              isFirst: index === 0,
              isLast: index === members.length - 1,
              onEarlier: () => onMove(member, -1),
              onLater: () => onMove(member, 1),
            }
          }
          {...actions}
        />
      ))}
    </ol>
  );
}

function TeamMemberCard({ member, index, reorder, onView, onEdit, onToggleStatus, onDelete }) {
  const isHidden = member.status === TEAM_MEMBER_STATUS.INACTIVE;
  const status = getTeamMemberStatus(member.status);

  return (
    <li
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 animate-rise-in hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 ${
        isHidden ? 'border-dashed border-slate-200' : 'border-slate-100 shadow-sm'
      }`}
      style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
    >
      {/* Soft teal wash behind the photo, brighter on hover */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-teal-50/80 to-transparent opacity-70 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
      <span
        className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-teal-400 to-teal-600 opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />

      <div className="relative flex items-center justify-between gap-3 px-4 pt-4">
        <span
          className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-white px-2 text-xs font-bold tabular-nums text-teal-600 ring-1 ring-teal-100"
          title={`Position ${index + 1} on the About page`}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onView(member)}
        aria-label={`View ${member.name}'s profile`}
        className={`relative flex flex-1 flex-col items-center px-5 pb-5 pt-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500/50 ${
          isHidden ? 'opacity-70' : ''
        }`}
      >
        <span className="rounded-full bg-linear-to-br from-teal-400 to-teal-600 p-1 shadow-lg shadow-teal-500/20 transition-transform duration-300 group-hover:scale-[1.04]">
          <Avatar
            src={buildTeamMemberAvatarUrl(member.avatar)}
            name={member.name}
            alt={`${member.name}'s photo`}
            className={`h-24 w-24 text-2xl ring-4 ring-white ${isHidden ? 'grayscale' : ''}`}
          />
        </span>

        <h3 className="mt-4 w-full truncate text-base font-bold text-slate-800">{member.name}</h3>
        <p className="mt-0.5 w-full truncate text-sm text-slate-500">{member.designation}</p>

        {member.linkedin ? (
          <span
            className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/15"
            title={member.linkedin}
          >
            <LinkedinIcon size={12} className="shrink-0" />
            <span className="truncate">{shortLinkedinLabel(member.linkedin)}</span>
          </span>
        ) : (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-200">
            <LinkedinIcon size={12} className="shrink-0" />
            No LinkedIn yet
          </span>
        )}
      </button>

      {/* Action bar */}
      <div className="relative flex items-center gap-1 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
        {reorder && <ReorderButtons {...reorder} name={member.name} />}
        <div className="ml-auto flex items-center gap-0.5">
          <RowActions member={member} onView={onView} onEdit={onEdit} onToggleStatus={onToggleStatus} onDelete={onDelete} />
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
        aria-label={`Move ${name} earlier`}
        title="Move earlier on the About page"
        className={`${iconButton} rounded-r-none hover:text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500/50`}
      >
        <ArrowLeft size={15} />
      </button>
      <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
      <button
        type="button"
        onClick={onLater}
        disabled={busy || isLast}
        aria-label={`Move ${name} later`}
        title="Move later on the About page"
        className={`${iconButton} rounded-l-none hover:text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500/50`}
      >
        <ArrowRight size={15} />
      </button>
    </div>
  );
}

function RowActions({ member, onView, onEdit, onToggleStatus, onDelete }) {
  const isHidden = member.status === TEAM_MEMBER_STATUS.INACTIVE;
  const ToggleIcon = isHidden ? PlayCircle : PauseCircle;
  return (
    <>
      <button
        type="button"
        onClick={() => onView(member)}
        aria-label="View team member"
        title="View"
        className={`${iconButton} hover:text-sky-600 hover:bg-sky-50 focus-visible:ring-sky-500/50`}
      >
        <Eye size={17} />
      </button>
      <button
        type="button"
        onClick={() => onEdit(member)}
        aria-label="Edit team member"
        title="Edit"
        className={`${iconButton} hover:text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500/50`}
      >
        <PencilLine size={17} />
      </button>
      <button
        type="button"
        onClick={() => onToggleStatus(member)}
        aria-label={isHidden ? 'Show team member on the website' : 'Hide team member from the website'}
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
        onClick={() => onDelete(member)}
        aria-label="Delete team member"
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
      className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-6 lg:grid-cols-3 2xl:grid-cols-4 animate-pulse"
      aria-label="Loading team members"
    >
      {[0, 1, 2, 3].map((card) => (
        <div key={card} className="flex flex-col items-center rounded-2xl border border-slate-100 p-5">
          <div className="flex w-full justify-between">
            <div className="h-7 w-7 rounded-lg bg-slate-100" />
            <div className="h-6 w-14 rounded-full bg-slate-100" />
          </div>
          <div className="mt-2 h-26 w-26 rounded-full bg-slate-100" />
          <div className="mt-4 h-4 w-28 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-36 rounded bg-slate-100" />
          <div className="mt-3 h-6 w-32 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
