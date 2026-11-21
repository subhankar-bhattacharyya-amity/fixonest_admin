// Provider "My Bookings": statuses, allowed transitions, tabs, filters and
// formatters. Everything about what a status means and which action may
// follow it lives here, so the slice, the page and (later) the backend share
// one set of rules.

export { normalizeBooking } from './bookingNormalizer.js';

export const BOOKING_STATUS = {
  PENDING: "pending", // assigned to the provider, waiting for accept / reject
  ACCEPTED: "accepted", // scheduled (legacy synonym for upcoming)
  UPCOMING: "upcoming", // scheduled / accepted timeslot locked
  IN_PROGRESS: "in_progress", // provider is on the job
  COMPLETED: "completed", // job done, cash not recorded yet
  PAID: "paid", // cash received and recorded
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

export const PAYMENT_STATUS = { UNPAID: "unpaid", PAID: "paid" };

export const BOOKING_ACTIONS = {
  ACCEPT: "accept",
  REJECT: "reject",
  START: "start",
  COMPLETE: "complete",
  RECORD_PAYMENT: "recordPayment",
};

// Label + badge colours for each status (the badge always shows text, so
// colour is never the only cue).
export const BOOKING_STATUS_META = {
  pending: { label: "New request", badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  accepted: { label: "Upcoming", badge: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  upcoming: { label: "Upcoming", badge: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  in_progress: { label: "In progress", badge: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-500" },
  completed: { label: "Completed", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  paid: { label: "Completed", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", badge: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  cancelled: { label: "Cancelled", badge: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};

// status -> { action: next status }. The only transitions a provider can make.
const TRANSITIONS = {
  pending: { accept: "upcoming", reject: "rejected" },
  accepted: { start: "in_progress" },
  upcoming: { start: "in_progress" },
  in_progress: { complete: "completed" },
  completed: { recordPayment: "paid" },
};

export const canApplyAction = (booking, action) => {
  if (!booking?.status) return false;
  return Boolean(TRANSITIONS[booking.status]?.[action]);
};

const ACTIVITY_NOTES = {
  accept: "You accepted the booking",
  reject: "You rejected the booking",
  start: "You started the job",
  complete: "You marked the job as completed",
  recordPayment: "Cash payment recorded",
};

// Returns the booking after `action` (a new object), or throws when the
// action isn't allowed from the booking's current status. `payload`:
// reject -> { reason }, complete -> { note }, recordPayment -> { amountReceived, receivedAt, note }.
export const applyBookingAction = (booking, action, payload = {}, at = new Date().toISOString()) => {
  const nextStatus = TRANSITIONS[booking.status]?.[action];
  if (!nextStatus) {
    throw new Error(`Can't ${action} a booking that is ${BOOKING_STATUS_META[booking.status]?.label ?? booking.status}`);
  }

  const next = { ...booking, status: nextStatus };
  let note = ACTIVITY_NOTES[action];

  if (action === BOOKING_ACTIONS.ACCEPT) next.acceptedAt = at;
  if (action === BOOKING_ACTIONS.REJECT) {
    next.rejectionReason = payload.reason || payload.rejectionReason;
    next.rejectedAt = at;
    note = `${note}: ${next.rejectionReason}`;
  }
  if (action === BOOKING_ACTIONS.START) next.startedAt = at;
  if (action === BOOKING_ACTIONS.COMPLETE) {
    next.completedAt = at;
    next.completionNote = payload.note?.trim() || null;
    if (next.completionNote) note = `${note}: ${next.completionNote}`;
  }
  if (action === BOOKING_ACTIONS.RECORD_PAYMENT) {
    next.paymentStatus = PAYMENT_STATUS.PAID;
    next.cashPayment = {
      amountReceived: Number(payload.amountReceived),
      receivedAt: payload.receivedAt ?? at,
      note: payload.note?.trim() || null,
    };
    note = `${formatMoney(payload.amountReceived)} received in cash`;
  }

  next.activity = [...(booking.activity || []), { status: nextStatus, note, actor: "provider", at }];
  return next;
};

// Tabs over the list. `statuses` empty = all.
export const BOOKING_TABS = [
  { key: "all", label: "All", statuses: [] },
  { key: "pending", label: "New requests", statuses: ["pending"] },
  { key: "accepted", label: "Upcoming", statuses: ["accepted", "upcoming"] },
  { key: "in_progress", label: "In progress", statuses: ["in_progress"] },
  { key: "completed", label: "Completed", statuses: ["completed", "paid"] },
  { key: "closed", label: "Rejected / Cancelled", statuses: ["rejected", "cancelled"] },
];

export const BOOKING_PERIODS = [
  { value: "", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

export const BOOKING_SORTS = [
  { value: "scheduled", label: "Visit date (soonest)" },
  { value: "newest", label: "Newest booked" },
  { value: "amount", label: "Amount (high to low)" },
];

export const REJECT_REASONS = [
  "Not available at this time",
  "Location is too far",
  "Service not offered by me",
  "Fully booked that day",
];

// Share of the booking total kept by Fixonest (DUMMY until the backend sets it).
export const PLATFORM_COMMISSION_RATE = 0.1;

// ---- helpers ----

export const getBookingStart = (booking) => {
  if (!booking) return new Date();
  const dateStr = booking.scheduledDate || booking.bookingDate || booking.date || new Date().toISOString().slice(0, 10);
  const [year, month, day] = dateStr.split("-").map(Number);

  let hour = 10;
  let minutes = 0;

  if (booking.startTime && typeof booking.startTime === "string" && booking.startTime.includes(":")) {
    const parts = booking.startTime.split(":");
    hour = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
  } else if (typeof booking.startHour === "number") {
    hour = Math.floor(booking.startHour);
    minutes = Math.round((booking.startHour - hour) * 60);
  }

  return new Date(year, month - 1, day, hour, minutes, 0, 0);
};

const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const isBookingInPeriod = (booking, period, now = new Date()) => {
  if (!period) return true;
  const start = getBookingStart(booking);
  const today = startOfDay(now);
  if (period === "today") return startOfDay(start).getTime() === today.getTime();
  if (period === "week") {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return start >= weekStart && start < weekEnd;
  }
  if (period === "month") return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
  return true;
};

export const matchesBookingSearch = (booking, search) => {
  const text = search.trim().toLowerCase();
  if (!text) return true;
  return [booking.bookingNumber, booking.id, booking.customer?.name, booking.customer?.phone, booking.service?.name, booking.service?.category]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(text));
};

export const sortBookings = (bookings, sort) =>
  [...bookings].sort((a, b) => {
    if (sort === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === "amount") return b.pricing.total - a.pricing.total;
    return getBookingStart(a) - getBookingStart(b);
  });

// 1499 -> "₹1,499"
export const formatMoney = (value) => `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

// Formats a booking identifier so raw 24-character hexadecimal MongoDB ObjectIds are never shown.
export const formatBookingNumber = (booking) => {
  if (!booking) return "";
  const num = typeof booking === "string" ? booking : (booking.bookingNumber || booking.id);
  if (!num) return "";
  const str = String(num).trim();
  if (/^[0-9a-fA-F]{24}$/.test(str)) {
    return `FN-BK-${str.slice(-6).toUpperCase()}`;
  }
  return str;
};

export const formatTimeString = (timeStr) => {
  if (!timeStr) return "";
  const parts = String(timeStr).split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  if (isNaN(h)) return String(timeStr);
  const suffix = h >= 12 && h < 24 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m).padStart(2, "0")} ${suffix}`;
};

export const formatHour = (hour) => {
  if (typeof hour !== "number" || isNaN(hour)) return "";
  const whole = Math.floor(hour);
  const minutes = Math.round((hour - whole) * 60);
  const suffix = whole >= 12 && whole < 24 ? "PM" : "AM";
  const display = whole % 12 === 0 ? 12 : whole % 12;
  return `${display}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

export const formatSlot = (booking) => {
  if (!booking) return "";
  if (booking.startTime && booking.endTime) {
    return `${formatTimeString(booking.startTime)} – ${formatTimeString(booking.endTime)}`;
  }
  if (booking.startHour !== undefined && booking.endHour !== undefined) {
    return `${formatHour(booking.startHour)} – ${formatHour(booking.endHour)}`;
  }
  if (booking.timeSlot) {
    const parts = String(booking.timeSlot).split(/\s*[-–]\s*/);
    if (parts.length === 2 && parts[0].includes(":") && parts[1].includes(":")) {
      return `${formatTimeString(parts[0])} – ${formatTimeString(parts[1])}`;
    }
    return booking.timeSlot;
  }
  return "";
};

const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const dateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const formatBookingDate = (booking) => longDate.format(getBookingStart(booking));
export const formatDateTime = (iso) => dateTime.format(new Date(iso));

// "Today, in 3 hrs" / "Tomorrow" / "In 4 days" / "Yesterday" / "6 days ago"
export const formatRelativeVisit = (booking, now = new Date()) => {
  const start = getBookingStart(booking);
  const days = Math.round((startOfDay(start) - startOfDay(now)) / 86400000);
  if (days === 0) {
    const hours = Math.round((start - now) / 3600000);
    if (hours > 0) return `Today, in ${hours} hr${hours > 1 ? "s" : ""}`;
    if (hours === 0) return "Now";
    return "Today";
  }
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
};

// "45m" / "1h 20m" left to respond to a request, or null once it's past.
export const formatTimeLeft = (iso, now = new Date()) => {
  const minutes = Math.round((new Date(iso) - now) / 60000);
  if (minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
};

// The customer's number stays hidden until the provider accepts.
export const isPhoneVisible = (booking) => !["pending", "rejected"].includes(booking.status);
export const maskPhone = (phone) => phone.replace(/(\+\d{2}\s?\d{2})[\d\s]+(\d{3})$/, "$1••• ••$2");

export const getMapsUrl = (address) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [address.line, address.area, address.city, address.pincode].filter(Boolean).join(", "),
  )}`;
