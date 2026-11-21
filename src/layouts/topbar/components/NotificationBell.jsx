import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, BellRing, MessageSquareText } from 'lucide-react';
import { useAuth, buildProfileImageUrl } from '@/features/auth/index.js';
import {
  useContactNotifications,
  ContactSenderBadge,
  CONTACT_NOTIFICATION_LIMIT,
  formatContactBadge,
} from '@/features/contact/index.js';
import { Avatar } from '@/components/common/avatar/index.js';
import { getDashboardPath } from '@/routes/constants.js';
import { formatRelativeTime } from '@/utils/formatDate.js';

const receivedAt = (contact) => new Date(contact.createdAt).getTime();

// The Topbar bell for the Super Admin and Admin: a badge with the number of
// new contact messages ("5+" past five), and a panel listing the newest ones.
// Opening the panel marks them read, so the badge clears - the panel itself
// keeps the "New" highlight on them until it's closed. Clicking a message
// opens it on the Contact page; clicking outside or pressing Escape closes
// the panel.
export default function NotificationBell() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { items, status, seenAt, unreadCount, markAllRead } = useContactNotifications();
  const rootRef = useRef(null);
  // null while closed. While open: when it was opened (the "now" for relative
  // times) and what counted as read at that moment (so what to highlight).
  const [session, setSession] = useState(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setSession(null);
    }
    function handleEscape(event) {
      if (event.key === 'Escape') setSession(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const contactsPath = `${getDashboardPath(role)}/contacts`;
  const open = session !== null;

  const toggle = () => {
    if (open) {
      setSession(null);
      return;
    }
    setSession({ openedAt: Date.now(), readUpTo: seenAt });
    markAllRead();
  };

  const openMessage = (contact) => {
    setSession(null);
    // ContactPage opens its details dialog for the message passed here.
    navigate(contactsPath, { state: { contact } });
  };

  const isNew = (contact) => open && receivedAt(contact) > session.readUpTo;
  const newCount = items.filter(isNew).length;
  const listed = items.slice(0, CONTACT_NOTIFICATION_LIMIT);
  const isFirstLoad = items.length === 0 && (status === 'idle' || status === 'loading');
  const badge = formatContactBadge(unreadCount);

  return (
    <div ref={rootRef} className="sm:relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unreadCount > 0 ? `Notifications, ${badge} new` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`relative p-2 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 ${
          open ? 'bg-teal-50 text-teal-600' : 'text-slate-500 hover:text-teal-600 hover:bg-slate-100'
        }`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none tabular-nums flex items-center justify-center ring-2 ring-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        // A full-width sheet under the Topbar on phones (the bell isn't at the
        // screen edge, so a panel anchored to it would run off the left side);
        // anchored to the bell from `sm` up.
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-3 top-18 z-40 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-xl shadow-slate-300/50 animate-rise-in"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-slate-100">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800">Notifications</h2>
              <p className="text-xs text-slate-400 mt-0.5">New contact messages</p>
            </div>
            {newCount > 0 && (
              <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/15">
                {formatContactBadge(newCount)} new
              </span>
            )}
          </div>

          {isFirstLoad ? (
            <div className="divide-y divide-slate-100 animate-pulse" aria-label="Loading notifications">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 max-w-full rounded bg-slate-100" />
                    <div className="h-2.5 w-52 max-w-full rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : listed.length === 0 ? (
            <div className="flex flex-col items-center text-center px-6 py-10">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <BellRing size={22} />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {status === 'failed' ? "Couldn't load notifications" : 'No notifications yet'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {status === 'failed'
                  ? 'They will appear here once the connection is back.'
                  : 'New contact messages will show up here.'}
              </p>
            </div>
          ) : (
            <ul className="max-h-[min(24rem,60vh)] overflow-y-auto divide-y divide-slate-100">
              {listed.map((contact) => (
                <li key={contact._id}>
                  <button
                    type="button"
                    onClick={() => openMessage(contact)}
                    className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500/50 ${
                      isNew(contact) ? 'bg-teal-50/50 hover:bg-teal-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Avatar src={buildProfileImageUrl(contact.user_id)} name={contact.fullName} className="h-9 w-9 text-xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-slate-600 wrap-break-word">
                        <span className="font-semibold text-slate-800">{contact.fullName}</span> sent a new message
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <MessageSquareText size={12} className="shrink-0 text-slate-400" />
                        <span className="truncate">{contact.subject}</span>
                      </span>
                      <span className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                        <ContactSenderBadge contact={contact} />
                        {formatRelativeTime(contact.createdAt, session.openedAt)}
                      </span>
                    </span>
                    {isNew(contact) && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" role="img" aria-label="New" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            to={contactsPath}
            onClick={() => setSession(null)}
            className="flex items-center justify-center gap-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
          >
            View all messages
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
