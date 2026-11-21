import { getContactSenderType } from '../definitions/contacts.js';

// "Registered" / "Guest" badge for a contact message - shared by the Contact
// listing and its details dialog, the dashboard's Recent Contacts card and the
// Topbar bell.
export default function ContactSenderBadge({ contact, className = '' }) {
  const { label, badge } = getContactSenderType(contact);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${badge} ${className}`}
    >
      {label}
    </span>
  );
}
