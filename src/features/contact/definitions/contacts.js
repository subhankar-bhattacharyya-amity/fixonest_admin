import { ROLES } from "@/features/auth/index.js";

// fixonest_backend/app/router/{super_admin,admin,provider}/contact.routes.js -
// the same read-only /v1/contact endpoints under each role's base path.
// Messages are written on the customer site - through the Contact page (to
// Fixonest) or a worker's "Get In Touch" form (to that provider) - so the
// panel only lists and shows them; there is no create, edit or delete. The
// Super Admin and Admins get every message; a provider only the ones sent to
// them (the backend enforces that).
export const CONTACT_API_PATHS = {
  [ROLES.SUPER_ADMIN]: "/super-admin/api/v1/contact",
  [ROLES.ADMIN]: "/admin/api/v1/contact",
  [ROLES.PROVIDER]: "/provider/api/v1/contact",
};

// Who a message was sent to: the provider (provider_id - populated with
// their name/email/photo) or, when that's null, Fixonest itself.
export const getContactRecipient = (contact) =>
  contact?.provider_id
    ? { isProvider: true, name: contact.provider_id.fullName ?? "A provider", email: contact.provider_id.email }
    : { isProvider: false, name: "Fixonest", email: null };

// Rows shown per page of the listing (paged in the browser - see
// contactSlice.js's fetchContacts).
export const CONTACTS_PER_PAGE = 10;

// Page size used while loading the whole inbox; the backend caps per_page
// server-side anyway.
export const CONTACT_FETCH_SIZE = 100;

// The Topbar bell (layouts/topbar/components/NotificationBell.jsx) lists this
// many of the newest messages; with more unread than that its badge reads
// "5+". The bell re-checks the inbox on this interval, and whenever the tab
// comes back into view.
export const CONTACT_NOTIFICATION_LIMIT = 5;
export const CONTACT_NOTIFICATION_POLL_MS = 60 * 1000;

// "3", or "5+" once there are more unread than the bell lists.
export const formatContactBadge = (count) =>
  count > CONTACT_NOTIFICATION_LIMIT ? `${CONTACT_NOTIFICATION_LIMIT}+` : String(count);

// The backend keeps no read state for a message, so "read" is remembered in
// this browser, per signed-in user: the createdAt of the newest message they
// had when they last opened the bell.
export const getContactSeenKey = (userId) => `contact_seen_at:${userId}`;

// Who sent a message - the backend's senderType (app/constant/contact.js),
// decided on the server from the sender's login token. "registered" was sent
// while logged in as a customer, and the row's user_id then carries their
// account (null if it has since been deleted); "anonymous" came from a guest.
export const CONTACT_SENDER_TYPES = {
  registered: {
    label: "Registered",
    badge: "bg-teal-50 text-teal-700 ring-teal-600/15",
  },
  anonymous: {
    label: "Guest",
    badge: "bg-slate-100 text-slate-600 ring-slate-500/15",
  },
};

// Messages saved before sender tracking existed have no senderType - guests.
const senderTypeOf = (contact) => (contact?.senderType === "registered" ? "registered" : "anonymous");

export const getContactSenderType = (contact) => CONTACT_SENDER_TYPES[senderTypeOf(contact)];

// "Sender" filter of the listing.
export const CONTACT_SENDER_FILTERS = [
  { value: "", label: "All" },
  { value: "registered", label: "Registered" },
  { value: "anonymous", label: "Guests" },
];

export const isContactFromSender = (contact, senderValue) =>
  !senderValue || senderTypeOf(contact) === senderValue;

const DAY_MS =24 * 60 * 60 * 1000;

// "Received" filter of the listing. `days` is a rolling window; "today" is the
// current calendar day instead.
export const CONTACT_PERIODS = [
  { value: "", label: "All" },
  { value: "today", label: "Today" },
  { value: "week", label: "7 Days", days: 7 },
  { value: "month", label: "30 Days", days: 30 },
];

// Whether a message was received inside the given period, measured from `now`
// (a timestamp - the slice's fetchedAt, so render stays pure).
export const isContactInPeriod = (contact, periodValue, now) => {
  const period = CONTACT_PERIODS.find((option) => option.value === periodValue);
  if (!period?.value) return true;
  const receivedAt = new Date(contact.createdAt).getTime();
  if (period.days) return now - receivedAt <= period.days * DAY_MS;
  return new Date(receivedAt).toDateString() === new Date(now).toDateString();
};

// Case-insensitive match against everything the sender typed.
export const matchesContactSearch = (contact, search) => {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [contact.fullName, contact.email, contact.subject, contact.message].some((value) =>
    String(value ?? "").toLowerCase().includes(query),
  );
};