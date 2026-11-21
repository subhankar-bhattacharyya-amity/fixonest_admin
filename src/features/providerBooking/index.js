// Public API of the providerBooking feature (the provider's "My Bookings").
// Import from "@/features/providerBooking/index.js", never reach into hooks/,
// store/ or definitions/ from outside this folder. DUMMY data until the
// provider bookings API exists.
export { useProviderBookings, usePendingBookingCount } from "./hooks/useProviderBookings.js";
// Booking UI shared with the Admin's Bookings pages (features/adminBooking).
export {
  BookingActivity,
  BookingStatusBadge,
  BookingStepper,
  DetailCard,
  DetailInfo,
  DetailRow,
} from "./components/index.js";
export {
  BOOKING_ACTIONS,
  BOOKING_PERIODS,
  BOOKING_SORTS,
  BOOKING_STATUS,
  BOOKING_STATUS_META,
  BOOKING_TABS,
  PAYMENT_STATUS,
  PLATFORM_COMMISSION_RATE,
  REJECT_REASONS,
  canApplyAction,
  formatBookingDate,
  formatBookingNumber,
  formatDateTime,
  formatHour,
  formatMoney,
  formatRelativeVisit,
  formatSlot,
  formatTimeLeft,
  formatTimeString,
  getBookingStart,
  getMapsUrl,
  isBookingInPeriod,
  isPhoneVisible,
  maskPhone,
  matchesBookingSearch,
  sortBookings,
} from "./definitions/providerBookings.js";
export {
  default as providerBookingReducer,
  fetchProviderBookings,
  updateProviderBooking,
} from "./store/providerBookingSlice.js";
