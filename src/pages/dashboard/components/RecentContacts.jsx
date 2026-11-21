import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { useAuth, buildProfileImageUrl } from '@/features/auth/index.js';
import { ContactSenderBadge } from '@/features/contact/index.js';
import { useRecentContacts, RECENT_CONTACTS_LIMIT, fetchRecentContacts } from '@/features/dashboard/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import { getDashboardPath } from '@/routes/constants.js';
import { formatRelativeTime } from '@/utils/formatDate.js';

// The dashboard's "Recent Contacts" card: the newest messages sent through the
// customer site's contact form. Clicking one opens it on the Contact page.
export default function RecentContacts() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { items, status, fetchedAt } = useRecentContacts();

  useEffect(() => {
    dispatch(fetchRecentContacts());
  }, [dispatch]);

  const contactsPath = `${getDashboardPath(role)}/contacts`;
  const isFirstLoad = items.length === 0 && (status === 'idle' || status === 'loading');

  // ContactPage opens its details dialog for the message passed here.
  const openMessage = (contact) => navigate(contactsPath, { state: { contact } });

  return (
    <div className="min-w-0 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
      <div className="flex justify-between items-center gap-3 mb-4">
        <h3 className="text-lg font-bold text-slate-800">Recent Contacts</h3>
        <Link to={contactsPath} className="shrink-0 text-sm text-teal-600 font-medium hover:text-teal-700">
          View All
        </Link>
      </div>

      {isFirstLoad ? (
        <div className="space-y-4 animate-pulse" aria-label="Loading recent contacts">
          {Array.from({ length: RECENT_CONTACTS_LIMIT }, (_, row) => (
            <div key={row} className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3">
              <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 max-w-full rounded bg-slate-100" />
                <div className="h-2.5 w-44 max-w-full rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center text-center px-4 py-10">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <MessageSquareText size={22} />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {status === 'failed' ? "Couldn't load the messages" : 'No messages yet'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {status === 'failed'
              ? 'Check your connection and reload the page.'
              : 'New contact messages will show up here.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((contact) => (
            <li key={contact._id}>
              <button
                type="button"
                onClick={() => openMessage(contact)}
                className="flex w-full items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl text-left hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
              >
                <Avatar src={buildProfileImageUrl(contact.user_id)} name={contact.fullName} className="h-10 w-10 text-sm" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-slate-700 truncate">{contact.fullName}</span>
                  <span className="block text-xs text-slate-400 truncate">{contact.subject}</span>
                </span>
                <span className="shrink-0 flex flex-col items-end gap-1">
                  <ContactSenderBadge contact={contact} />
                  <span className="text-[11px] text-slate-400">{formatRelativeTime(contact.createdAt, fetchedAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
