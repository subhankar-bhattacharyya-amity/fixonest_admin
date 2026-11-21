import { Ban, CalendarCheck2, CalendarOff, Clock3, Undo2 } from "lucide-react";
import { ROLES } from "@/features/auth/index.js";

// fixonest_backend/app/router/<role>/provider_availability.routes.js
// (module app/modules/provider_availability/). A provider asks for time off;
// it stays "pending" until an Admin (their vertical's providers only) or the
// Super Admin approves or rejects it. Only an approved request makes the
// provider unavailable.
export const TIME_OFF_API_PATHS = {
  [ROLES.PROVIDER]: "/provider/api/v1/provider-availability/my-requests",
  [ROLES.SUPER_ADMIN]: "/super-admin/api/v1/provider-availability",
  [ROLES.ADMIN]: "/admin/api/v1/provider-availability",
};
// The provider submits to the collection path, then reads its own requests
// from /my-requests (TIME_OFF_API_PATHS[PROVIDER]).
export const PROVIDER_TIME_OFF_CREATE_PATH = "/provider/api/v1/provider-availability";

// Public business calendar (fixonest_backend/app/router/customer/working_hours.routes.js):
// weekly open days + holidays, shown on the provider's Booking Calendar.
export const PUBLIC_WORKING_HOURS_PATH = "/api/v1/working-hours";

// Must match PROVIDER_MIN_NOTICE_DAYS in provider_availability.repositories.js:
// the earliest date a provider can ask off is today + 3.
export const MIN_NOTICE_DAYS = 3;

export const TIME_OFF_PER_PAGE = 10;
export const REASON_MAX = 500;
export const NOTE_MAX = 500;

// Mirrors STATUS_ENUM in provider_availability.model.js.
export const TIME_OFF_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

export const TIME_OFF_STATUS_META = {
  pending: {
    label: "Awaiting approval",
    short: "Pending",
    icon: Clock3,
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  approved: {
    label: "Approved - day off",
    short: "Approved",
    icon: CalendarCheck2,
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
  rejected: {
    label: "Not approved",
    short: "Rejected",
    icon: Ban,
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
  cancelled: {
    label: "Withdrawn",
    short: "Withdrawn",
    icon: Undo2,
    badge: "bg-slate-100 text-slate-500 ring-slate-200",
    dot: "bg-slate-300",
  },
};

export const getTimeOffStatus = (status) => TIME_OFF_STATUS_META[status] ?? TIME_OFF_STATUS_META.pending;

// Tabs on Provider Management's "Time-off Requests". `value` is the API's
// status filter ("" = all).
export const TIME_OFF_FILTERS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Withdrawn" },
  { value: "", label: "All" },
];

// Quick picks in the provider's request form.
export const TIME_OFF_REASONS = [
  "Personal work",
  "Medical appointment",
  "Family function",
  "Travelling",
  "Festival leave",
];

export const TIME_OFF_ICON = CalendarOff;

// ---- dates ("YYYY-MM-DD" strings, local time, never UTC) ----

const pad = (value) => String(value).padStart(2, "0");
const DAY_MS = 24 * 60 * 60 * 1000;

export const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseDateKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const todayKey = (now = new Date()) => toDateKey(now);

export const addDays = (key, days) => {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

export const daysFromToday = (key, now = new Date()) =>
  Math.round((parseDateKey(key) - parseDateKey(todayKey(now))) / DAY_MS);

// The first date a provider may request off (same rule as the backend).
export const earliestTimeOffDate = (now = new Date()) => addDays(todayKey(now), MIN_NOTICE_DAYS);

export const isTimeOffDateAllowed = (key, now = new Date()) => key >= earliestTimeOffDate(now);

// The 6x7 (or 5x7) grid of dates for a month view, Monday first. Each cell:
// { key, day, inMonth }.
export const buildMonthGrid = (year, month) => {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(year, month, 1 - offset);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { key: toDateKey(date), day: date.getDate(), inMonth: date.getMonth() === month };
  });
};

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const monthFormat = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const longFormat = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const mediumFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const shortMonth = new Intl.DateTimeFormat("en-IN", { month: "short" });
const weekdayShort = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
const stampFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const formatMonthTitle = (year, month) => monthFormat.format(new Date(year, month, 1));
export const formatLongDay = (key) => longFormat.format(parseDateKey(key));
export const formatMediumDay = (key) => mediumFormat.format(parseDateKey(key));
export const formatShortMonth = (key) => shortMonth.format(parseDateKey(key));
export const formatWeekdayShort = (key) => weekdayShort.format(parseDateKey(key));
export const formatStamp = (iso) => (iso ? stampFormat.format(new Date(iso)) : "");

// "Today" / "Tomorrow" / "In 5 days" / "Yesterday" / "3 days ago"
export const relativeDay = (key, now = new Date()) => {
  const days = daysFromToday(key, now);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
};

// "09:30" -> "9:30 AM"
export const formatClock = (time) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 === 0 ? 12 : hours % 12}:${pad(minutes)} ${suffix}`;
};

export const formatTimeOffSpan = (record) =>
  record.isFullDay ? "Full day" : `${formatClock(record.startTime)} – ${formatClock(record.endTime)}`;

// ---- business calendar (public working hours) ----

// The holiday that falls on `key`, if any. A yearly holiday matches on
// month-day in any year. "special_working_day" means open, so it's skipped.
export const findHoliday = (holidays, key) =>
  holidays.find(
    (holiday) =>
      holiday.type !== "special_working_day" &&
      (holiday.date === key || (holiday.recurringAnnually && holiday.date.slice(5) === key.slice(5))),
  ) ?? null;

export const isSpecialWorkingDay = (holidays, key) =>
  holidays.some((holiday) => holiday.type === "special_working_day" && holiday.date === key);

// Whether Fixonest is closed on that weekday (weeklySchedule[].dayIndex, 0 = Sunday).
export const isClosedWeekday = (weeklySchedule, key) => {
  if (!weeklySchedule?.length) return false;
  const day = weeklySchedule.find((item) => item.dayIndex === parseDateKey(key).getDay());
  return day ? !day.isOpen : false;
};

// The time-off record that decides how a date looks for the provider:
// approved beats pending; rejected / withdrawn ones don't block anything.
export const activeTimeOffFor = (records, key) => {
  const sameDay = records.filter((record) => record.date === key);
  return (
    sameDay.find((record) => record.status === TIME_OFF_STATUS.APPROVED) ??
    sameDay.find((record) => record.status === TIME_OFF_STATUS.PENDING) ??
    null
  );
};
