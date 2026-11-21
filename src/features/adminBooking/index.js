// Public API of the adminBooking feature ("Booking Management" - the Super
// Admin sees every vertical, an Admin only their own; see useAdminBookings).
// Import from "@/features/adminBooking/index.js".
// DUMMY data until the bookings API exists. Statuses, formatters and the
// shared booking UI come from "@/features/providerBooking/index.js".
export { useAdminBookings, useRejectedBookingCount } from "./hooks/useAdminBookings.js";
export {
  ADMIN_BOOKING_ACTIONS,
  ADMIN_BOOKING_TABS,
  ADMIN_BOOKINGS_PER_PAGE,
  ADMIN_CANCEL_REASONS,
  canAdminAct,
  getRejectedProviderIds,
  isAssignable,
  matchesAdminBookingSearch,
  rankProvidersForBooking,
} from "./definitions/adminBookings.js";
export { DUMMY_PROVIDERS, DUMMY_VERTICALS } from "./definitions/adminBookings.mock.js";
export { default as adminBookingReducer, fetchAdminBookings, updateAdminBooking } from "./store/adminBookingSlice.js";
