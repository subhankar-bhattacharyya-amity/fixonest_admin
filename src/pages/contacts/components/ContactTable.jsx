import { Clock, Eye, Mail } from 'lucide-react';
import { Avatar } from '@/components/common/avatar/index.js';
import { buildProfileImageUrl } from '@/features/auth/index.js';
import { ContactSenderBadge, getContactRecipient } from '@/features/contact/index.js';
import { formatDate, formatRelativeTime } from '@/utils/formatDate.js';

// Contact messages listing: a table from `lg` up, stacked cards below it.
// Purely presentational - the page owns data loading, filters and the details
// dialog. The whole row (or card) opens the message; the sender's name and the
// eye are real buttons inside it so keyboard users get the same action - their
// click simply bubbles up to the row.
// showRecipient adds a "To: <provider>" / "To: Fixonest" line - off for a
// provider, whose messages are all sent to them.
export default function ContactTable({ contacts, startIndex = 0, now, isLoading, showRecipient = false, onView }) {
  if (isLoading && contacts.length === 0) return <TableSkeleton />;

  return (
    <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-60' : ''}`}>
      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th scope="col" className="w-14 px-6 py-3.5">#</th>
              <th scope="col" className="px-6 py-3.5">Sender</th>
              <th scope="col" className="px-6 py-3.5">Type</th>
              <th scope="col" className="px-6 py-3.5">Message</th>
              <th scope="col" className="px-6 py-3.5">Received</th>
              <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contacts.map((contact, index) => (
              <tr
                key={contact._id}
                onClick={() => onView(contact)}
                className="group cursor-pointer hover:bg-teal-50/30 transition-colors animate-rise-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <td className="px-6 py-4 text-slate-400 font-medium tabular-nums">{startIndex + index + 1}</td>
                <td className="px-6 py-4 max-w-64">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={buildProfileImageUrl(contact.user_id)} name={contact.fullName} className="h-10 w-10 text-sm ring-2 ring-white shadow-sm" />
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="block max-w-full truncate text-left font-semibold text-slate-800 group-hover:text-teal-600 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
                      >
                        {contact.fullName}
                      </button>
                      <p className="flex items-center gap-1 text-xs text-slate-400 truncate">
                        <Mail size={11} className="shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <ContactSenderBadge contact={contact} />
                  {showRecipient && <RecipientLine contact={contact} className="mt-1.5" />}
                </td>
                <td className="px-6 py-4 max-w-sm">
                  <p className="font-medium text-slate-700 truncate">{contact.subject}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{contact.message}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-slate-600 font-medium">{formatRelativeTime(contact.createdAt, now)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(new Date(contact.createdAt))}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      aria-label={`View message from ${contact.fullName}`}
                      title="View message"
                      className="p-2 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
                    >
                      <Eye size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet */}
      <ul className="lg:hidden divide-y divide-slate-100">
        {contacts.map((contact, index) => (
          <li key={contact._id} className="animate-rise-in" style={{ animationDelay: `${index * 40}ms` }}>
            <button
              type="button"
              onClick={() => onView(contact)}
              className="block w-full p-4 text-left hover:bg-teal-50/30 active:bg-teal-50/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500/50"
            >
              <span className="flex items-center gap-3 min-w-0">
                <Avatar src={buildProfileImageUrl(contact.user_id)} name={contact.fullName} className="h-10 w-10 text-sm ring-2 ring-white shadow-sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-800">{contact.fullName}</span>
                  <span className="block truncate text-xs text-slate-400">{contact.email}</span>
                </span>
                <ContactSenderBadge contact={contact} />
              </span>
              {showRecipient && <RecipientLine contact={contact} className="mt-2" />}
              <span className="mt-3 block truncate text-sm font-medium text-slate-700">{contact.subject}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 line-clamp-2 wrap-break-word">
                {contact.message}
              </span>
              <span className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-slate-100 pt-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock size={12} />
                  {formatRelativeTime(contact.createdAt, now)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600">
                  <Eye size={13} />
                  View
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// "To: Nisha Poddar" for a message sent to a provider, "To: Fixonest" for one
// sent through the Contact page.
function RecipientLine({ contact, className = '' }) {
  const recipient = getContactRecipient(contact);
  return (
    <span className={`block max-w-40 truncate text-xs text-slate-400 ${className}`} title={recipient.email ?? undefined}>
      To:{' '}
      <span className={`font-medium ${recipient.isProvider ? 'text-teal-700' : 'text-slate-500'}`}>{recipient.name}</span>
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-100 animate-pulse" aria-label="Loading messages">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 lg:px-6 py-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 max-w-full rounded bg-slate-100" />
            <div className="h-3 w-56 max-w-full rounded bg-slate-100" />
          </div>
          <div className="hidden lg:block h-3.5 w-48 rounded bg-slate-100" />
          <div className="hidden sm:block h-3.5 w-20 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
