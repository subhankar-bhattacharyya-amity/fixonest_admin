// Public API of the contact feature. Import from "@/features/contact/index.js",
// never reach into hooks/, store/, or definitions/ from outside this folder.
export { useContacts } from "./hooks/useContacts.js";
export { useContactNotifications } from "./hooks/useContactNotifications.js";
export { default as ContactSenderBadge } from "./components/ContactSenderBadge.jsx";
export {
  CONTACTS_PER_PAGE,
  CONTACT_PERIODS,
  CONTACT_SENDER_FILTERS,
  CONTACT_NOTIFICATION_LIMIT,
  formatContactBadge,
  getContactRecipient,
  isContactInPeriod,
  isContactFromSender,
  matchesContactSearch,
} from "./definitions/contacts.js";
export { default as contactReducer, fetchContacts } from "./store/contactSlice.js";
