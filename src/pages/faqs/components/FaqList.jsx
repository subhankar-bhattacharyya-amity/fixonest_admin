import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Eye, PauseCircle, PencilLine, PlayCircle, Trash2 } from 'lucide-react';
import { FAQ_STATUS, getFaqStatus } from '@/features/faq/index.js';
import { formatDate } from '@/utils/formatDate.js';

// A section's FAQs in display order, as accordion rows like the customer site
// shows them: click a question to read its full answer. Purely presentational
// - the page owns data loading, filters, reordering and dialogs.
// `canReorder` is false while a search or filter hides some rows, because
// "move up" would then be ambiguous.
export default function FaqList({
  faqs,
  isLoading,
  canReorder,
  reorderBusy,
  onMove,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}) {
  const [openId, setOpenId] = useState(null);

  if (isLoading && faqs.length === 0) return <ListSkeleton />;

  const actions = { onView, onEdit, onToggleStatus, onDelete };

  return (
    <ol className={`divide-y divide-slate-100 transition-opacity duration-200 ${isLoading ? 'opacity-60' : ''}`}>
      {faqs.map((faq, index) => (
        <FaqRow
          key={faq._id}
          faq={faq}
          index={index}
          isOpen={openId === faq._id}
          onToggleOpen={() => setOpenId((current) => (current === faq._id ? null : faq._id))}
          reorder={
            canReorder && {
              busy: reorderBusy,
              isFirst: index === 0,
              isLast: index === faqs.length - 1,
              onUp: () => onMove(faq, -1),
              onDown: () => onMove(faq, 1),
            }
          }
          {...actions}
        />
      ))}
    </ol>
  );
}

function FaqRow({ faq, index, isOpen, onToggleOpen, reorder, onView, onEdit, onToggleStatus, onDelete }) {
  const isHidden = faq.status === FAQ_STATUS.INACTIVE;
  const answerId = `faq-answer-${faq._id}`;

  return (
    <li
      className={`group relative transition-colors animate-rise-in ${isOpen ? 'bg-teal-50/30' : 'hover:bg-slate-50/70'}`}
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      {/* Accent bar on the open row */}
      <span
        className={`absolute left-0 top-0 h-full w-1 rounded-r-full bg-linear-to-b from-teal-400 to-teal-600 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      <div className="flex items-start gap-3 sm:gap-4 px-4 py-4 sm:px-6">
        <PositionBadge position={index + 1} status={faq.status} />

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggleOpen}
            aria-expanded={isOpen}
            aria-controls={answerId}
            className="flex w-full items-start gap-3 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
          >
            <span className="min-w-0 flex-1">
              <span
                className={`block font-semibold leading-snug ${isHidden ? 'text-slate-500' : 'text-slate-800'} ${
                  isOpen ? '' : 'line-clamp-2'
                }`}
              >
                {faq.question}
              </span>
              {!isOpen && <span className="mt-1 block text-sm text-slate-500 line-clamp-1">{faq.answer}</span>}
            </span>
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                isOpen ? 'rotate-180 bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
              }`}
              aria-hidden="true"
            >
              <ChevronDown size={15} />
            </span>
          </button>

          {/* Full answer - the grid-rows trick animates to the content's height */}
          <div
            id={answerId}
            className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
          >
            <div className="overflow-hidden">
              <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-100 whitespace-pre-line">
                {faq.answer}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusPill status={faq.status} />
            <span className="text-xs text-slate-400">Updated {formatDate(new Date(faq.updatedAt ?? faq.createdAt))}</span>
            <div className="ml-auto flex items-center gap-1">
              {reorder && <ReorderButtons {...reorder} question={faq.question} />}
              <RowActions faq={faq} onView={onView} onEdit={onEdit} onToggleStatus={onToggleStatus} onDelete={onDelete} />
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

// "01", "02", ... - the FAQ's position on the website, with its status dot.
function PositionBadge({ position, status }) {
  return (
    <span className="relative mt-0.5 shrink-0" title={`Position ${position} on the website`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-sm font-bold tabular-nums text-teal-600 ring-1 ring-teal-100">
        {String(position).padStart(2, '0')}
      </span>
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${getFaqStatus(status).dot}`}
        aria-hidden="true"
      />
    </span>
  );
}

function StatusPill({ status }) {
  const { label, badge, dot } = getFaqStatus(status);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

const iconButton =
  'p-2 rounded-lg text-slate-500 transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500';

function ReorderButtons({ busy, isFirst, isLast, onUp, onDown, question }) {
  return (
    <div className="mr-1 flex items-center rounded-lg ring-1 ring-slate-200 bg-white">
      <button
        type="button"
        onClick={onUp}
        disabled={busy || isFirst}
        aria-label={`Move "${question}" up`}
        title="Move up"
        className={`${iconButton} rounded-r-none hover:text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500/50`}
      >
        <ArrowUp size={15} />
      </button>
      <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
      <button
        type="button"
        onClick={onDown}
        disabled={busy || isLast}
        aria-label={`Move "${question}" down`}
        title="Move down"
        className={`${iconButton} rounded-l-none hover:text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500/50`}
      >
        <ArrowDown size={15} />
      </button>
    </div>
  );
}

function RowActions({ faq, onView, onEdit, onToggleStatus, onDelete }) {
  const isHidden = faq.status === FAQ_STATUS.INACTIVE;
  const ToggleIcon = isHidden ? PlayCircle : PauseCircle;
  return (
    <>
      <button
        type="button"
        onClick={() => onView(faq)}
        aria-label="View FAQ"
        title="View"
        className={`${iconButton} hover:text-sky-600 hover:bg-sky-50 focus-visible:ring-sky-500/50`}
      >
        <Eye size={17} />
      </button>
      <button
        type="button"
        onClick={() => onEdit(faq)}
        aria-label="Edit FAQ"
        title="Edit"
        className={`${iconButton} hover:text-teal-600 hover:bg-teal-50 focus-visible:ring-teal-500/50`}
      >
        <PencilLine size={17} />
      </button>
      <button
        type="button"
        onClick={() => onToggleStatus(faq)}
        aria-label={isHidden ? 'Show FAQ on the website' : 'Hide FAQ from the website'}
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
        onClick={() => onDelete(faq)}
        aria-label="Delete FAQ"
        title="Delete"
        className={`${iconButton} hover:text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-500/50`}
      >
        <Trash2 size={17} />
      </button>
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-slate-100 animate-pulse" aria-label="Loading FAQs">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-start gap-4 px-4 sm:px-6 py-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-4 w-3/4 max-w-full rounded bg-slate-100" />
            <div className="h-3 w-1/2 max-w-full rounded bg-slate-100" />
            <div className="h-5 w-16 rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
