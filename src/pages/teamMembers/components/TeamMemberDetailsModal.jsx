import { BriefcaseBusiness, CalendarClock, ExternalLink, Eye, Hash, PencilLine } from 'lucide-react';
import {
  TEAM_MEMBER_STATUS,
  getTeamMemberStatus,
  buildTeamMemberAvatarUrl,
  shortLinkedinLabel,
} from '@/features/teamMember/index.js';
import { Modal } from '@/components/common/modal/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import { formatDateTime } from '@/utils/formatDate.js';
import LinkedinIcon from './LinkedinIcon.jsx';

// Read-only view of one team member, from its listing card, with a shortcut to edit it.
export default function TeamMemberDetailsModal({ member, position, onClose, onEdit }) {
  const status = getTeamMemberStatus(member.status);
  const StatusIcon = status.icon;

  const meta = [
    { label: 'Position', value: `#${position} on the About page`, icon: Hash },
    {
      label: 'Visibility',
      value: member.status === TEAM_MEMBER_STATUS.INACTIVE ? 'Hidden from the website' : 'Live on the website',
      icon: StatusIcon,
    },
    { label: 'Added', value: formatDateTime(member.createdAt), icon: CalendarClock },
    { label: 'Last updated', value: formatDateTime(member.updatedAt ?? member.createdAt), icon: CalendarClock },
  ];

  return (
    <Modal
      title="Team Member Details"
      description="A person in the About page's “Meet the team” section."
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
            onClick={() => onEdit(member)}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 font-medium"
          >
            <PencilLine size={18} />
            Edit Member
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Profile */}
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-50 to-teal-50/60 p-6 text-center ring-1 ring-slate-100">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-200/30 blur-2xl" aria-hidden="true" />
          <div className="relative flex flex-col items-center">
            <span className="rounded-full bg-linear-to-br from-teal-400 to-teal-600 p-1 shadow-lg shadow-teal-500/20">
              <Avatar
                src={buildTeamMemberAvatarUrl(member.avatar)}
                name={member.name}
                alt={`${member.name}'s photo`}
                className="h-28 w-28 text-3xl ring-4 ring-white"
              />
            </span>
            <h3 className="mt-4 text-xl font-bold text-slate-800">{member.name}</h3>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-slate-500">
              <BriefcaseBusiness size={14} aria-hidden="true" />
              {member.designation}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                {status.label}
              </span>
              {member.linkedin ? (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/20 hover:bg-sky-50 transition-colors"
                >
                  <LinkedinIcon size={12} className="shrink-0" />
                  <span className="truncate">{shortLinkedinLabel(member.linkedin)}</span>
                  <ExternalLink size={11} className="shrink-0" aria-hidden="true" />
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-400 ring-1 ring-inset ring-slate-200">
                  <LinkedinIcon size={12} />
                  No LinkedIn profile added
                </span>
              )}
            </div>
          </div>
        </div>

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
