import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Mail,
  MessageSquareText,
  Phone,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Avatar } from '@/components/common/avatar/index.js';
import { Modal } from '@/components/common/modal/index.js';
import { useAuth, ROLES, buildProfileImageUrl } from '@/features/auth/index.js';
import { ContactSenderBadge, getContactRecipient } from '@/features/contact/index.js';
import { formatCustomerPhone, getCustomerAccountStatus } from '@/features/customer/index.js';
import { ROUTES } from '@/routes/constants.js';
import { formatDateTime, formatRelativeTime } from '@/utils/formatDate.js';

const COPIED_RESET_MS = 2000;

// Read-only view of one contact message. The listing row already carries the
// whole message, so the dialog opens instantly with no extra request.
export default function ContactDetailsModal({ contact, now, onClose }) {
  const { role } = useAuth();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef(null);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contact.email);
      toast.success('Email address copied');
      setCopied(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      toast.error("Couldn't copy the email address");
    }
  };

  const CopyIcon = copied ? Check : Copy;

  // user_id is the sender's account for a registered sender; null for a
  // guest, and for a registered sender whose account was deleted since.
  const isRegistered = contact.senderType === 'registered';
  const account = contact.user_id;
  const accountStatus = getCustomerAccountStatus(account?.accountStatus);
  const accountPhone = formatCustomerPhone(account);
  const recipient = getContactRecipient(contact);
  const isProvider = role === ROLES.PROVIDER;

  return (
    <Modal
      title="Message Details"
      description={
        !recipient.isProvider
          ? "Sent through the customer site's contact form."
          : isProvider
            ? 'Sent to you from your profile page on the customer site.'
            : "Sent from a provider's profile page on the customer site."
      }
      icon={MessageSquareText}
      size="lg"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
        >
          Close
        </button>
      }
    >
      <div className="space-y-6">
        {/* Sender */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-linear-to-br from-teal-50/70 via-white to-white p-5 text-center sm:flex-row sm:text-left">
          <Avatar src={buildProfileImageUrl(contact.user_id)} name={contact.fullName} className="h-16 w-16 text-xl ring-4 ring-white shadow-md" />
          <div className="min-w-0 max-w-full flex-1">
            <p className="text-lg font-bold text-slate-800 truncate">{contact.fullName}</p>
            <p className="text-sm text-slate-500 truncate">{contact.email}</p>
            <ContactSenderBadge contact={contact} className="mt-2" />
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/15">
            <Clock size={12} />
            {formatRelativeTime(contact.createdAt, now)}
          </span>
        </div>

        {/* Facts */}
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center">
              <Mail size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <dt className="text-xs font-medium text-slate-400">Email</dt>
              <dd className="text-sm font-semibold text-slate-700 truncate">{contact.email}</dd>
            </div>
            <button
              type="button"
              onClick={copyEmail}
              aria-label="Copy email address"
              title={copied ? 'Copied' : 'Copy email'}
              className={`-mr-1.5 p-2 shrink-0 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 ${
                copied ? 'text-teal-600 bg-teal-50' : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'
              }`}
            >
              <CopyIcon size={16} />
            </button>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center">
              <CalendarDays size={16} />
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-slate-400">Received</dt>
              <dd className="text-sm font-semibold text-slate-700 truncate">{formatDateTime(contact.createdAt)}</dd>
            </div>
          </div>
          {/* Only the worker "Get In Touch" form asks for a phone number */}
          {contact.phone && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center">
                <Phone size={16} />
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-slate-400">Phone</dt>
                <dd className="text-sm font-semibold text-slate-700 truncate">
                  <a href={`tel:${contact.phone}`} className="hover:text-teal-600 transition-colors">
                    {contact.phone}
                  </a>
                </dd>
              </div>
            </div>
          )}
          {/* A provider's messages are all to them - no need to say so */}
          {!isProvider && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center">
                <BriefcaseBusiness size={16} />
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-slate-400">Sent to</dt>
                <dd className="text-sm font-semibold text-slate-700 truncate">
                  {recipient.isProvider ? `${recipient.name} (provider)` : 'Fixonest'}
                </dd>
              </div>
            </div>
          )}
        </dl>

        {/* Who sent it - decided by the backend from the sender's login */}
        {isRegistered && account ? (
          <div className="rounded-xl border border-teal-100 bg-teal-50/40 px-4 py-3.5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-white text-teal-600 flex items-center justify-center shadow-sm">
                <UserCheck size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-400">Sent from a customer account</p>
                <p className="text-sm font-semibold text-slate-700 truncate">{account.fullName}</p>
                <p className="text-xs text-slate-500 truncate">
                  {[account.email, accountPhone].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${accountStatus.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${accountStatus.dot}`} aria-hidden="true" />
                {accountStatus.label}
              </span>
            </div>
            {account.email?.toLowerCase() !== contact.email?.toLowerCase() && (
              <p className="mt-3 text-xs text-slate-500">
                The email typed in the form is different from this account's email.
              </p>
            )}
            {/* Customer Management is a Super Admin page */}
            {role === ROLES.SUPER_ADMIN && (
              <Link
                to={ROUTES.CUSTOMERS}
                state={{ search: account.email }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                View in Customer Management
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-white text-slate-400 flex items-center justify-center shadow-sm">
              {isRegistered ? <UserCheck size={16} /> : <UserX size={16} />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">
                {isRegistered ? 'Sent from a customer account' : 'Sent by a guest'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRegistered
                  ? 'That account has since been deleted.'
                  : 'The sender was not logged in, so the name and email are unverified.'}
              </p>
            </div>
          </div>
        )}

        {/* Subject + message */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Subject</h3>
          <p className="mt-1.5 text-base font-bold text-slate-800 wrap-break-word">{contact.subject}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Message</h3>
          <p className="mt-2 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap wrap-break-word">
            {contact.message}
          </p>
        </div>
      </div>
    </Modal>
  );
}
