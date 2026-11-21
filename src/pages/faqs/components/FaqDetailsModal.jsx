import { CalendarClock, Eye, Hash, PencilLine } from 'lucide-react';
import { FAQ_STATUS, getFaqStatus } from '@/features/faq/index.js';
import { Modal } from '@/components/common/modal/index.js';
import { formatDateTime } from '@/utils/formatDate.js';

// Read-only view of one FAQ, from its listing row, with a shortcut to edit it.
export default function FaqDetailsModal({ faq, section, position, onClose, onEdit }) {
  const status = getFaqStatus(faq.status);
  const StatusIcon = status.icon;

  const meta = [
    { label: 'Position', value: `#${position} on the ${section.label}`, icon: Hash },
    {
      label: 'Visibility',
      value: faq.status === FAQ_STATUS.INACTIVE ? 'Hidden from the website' : 'Live on the website',
      icon: StatusIcon,
    },
    { label: 'Created', value: formatDateTime(faq.createdAt), icon: CalendarClock },
    { label: 'Last updated', value: formatDateTime(faq.updatedAt ?? faq.createdAt), icon: CalendarClock },
  ];

  return (
    <Modal
      title="FAQ Details"
      description={`A question on the ${section.label}.`}
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
            onClick={() => onEdit(faq)}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 font-medium"
          >
            <PencilLine size={18} />
            Edit FAQ
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
            <section.icon size={12} />
            {section.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
            {status.label}
          </span>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Question</p>
          <h3 className="mt-1.5 text-lg font-bold leading-snug text-slate-800">{faq.question}</h3>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Answer</p>
          <p className="mt-1.5 rounded-xl bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-100 whitespace-pre-line">
            {faq.answer}
          </p>
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
