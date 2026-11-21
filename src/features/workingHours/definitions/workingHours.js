import { Building2, CalendarCheck2, Flag, Siren } from "lucide-react";

// fixonest_backend/app/router/super_admin/working_hours.routes.js & admin/working_hours.routes.js
export const WORKING_HOURS_API_PATHS = {
  super_admin: "/super-admin/api/v1/working-hours",
  admin: "/admin/api/v1/working-hours",
};
export const WORKING_HOURS_API_PATH = WORKING_HOURS_API_PATHS.super_admin;

// Days in the order the page lists them (Monday first). `dayIndex` matches
// the backend's weeklySchedule[].dayIndex (0 = Sunday, like JS Date.getDay()).
export const WEEK_DAYS = [
  { day: "monday", dayIndex: 1, label: "Monday", short: "Mon" },
  { day: "tuesday", dayIndex: 2, label: "Tuesday", short: "Tue" },
  { day: "wednesday", dayIndex: 3, label: "Wednesday", short: "Wed" },
  { day: "thursday", dayIndex: 4, label: "Thursday", short: "Thu" },
  { day: "friday", dayIndex: 5, label: "Friday", short: "Fri" },
  { day: "saturday", dayIndex: 6, label: "Saturday", short: "Sat" },
  { day: "sunday", dayIndex: 0, label: "Sunday", short: "Sun" },
];

// Mirrors the holiday `type` enum in working_hours.model.js.
export const HOLIDAY_TYPES = {
  public_holiday: {
    label: "Public Holiday",
    hint: "National or regional holiday",
    icon: Flag,
    badge: "bg-teal-50 text-teal-700 ring-teal-600/15",
    tile: "from-teal-500 to-teal-600 shadow-teal-500/25",
  },
  company_holiday: {
    label: "Company Holiday",
    hint: "A day off set by Fixonest",
    icon: Building2,
    badge: "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
    tile: "from-indigo-500 to-indigo-600 shadow-indigo-500/25",
  },
  emergency_closure: {
    label: "Emergency Closure",
    hint: "Unplanned closure, e.g. weather",
    icon: Siren,
    badge: "bg-rose-50 text-rose-700 ring-rose-600/15",
    tile: "from-rose-500 to-rose-600 shadow-rose-500/25",
  },
  special_working_day: {
    label: "Special Working Day",
    hint: "Open on a day you'd normally close",
    icon: CalendarCheck2,
    badge: "bg-amber-50 text-amber-700 ring-amber-600/15",
    tile: "from-amber-500 to-amber-600 shadow-amber-500/25",
  },
};

export const HOLIDAY_TYPE_OPTIONS = Object.entries(HOLIDAY_TYPES).map(([value, meta]) => ({ value, ...meta }));

export const getHolidayType = (type) => HOLIDAY_TYPES[type] ?? HOLIDAY_TYPES.public_holiday;

// Limits from working_hours.model.js / working_hours.validator.js.
export const HOLIDAY_TITLE_MAX = 100;
export const HOLIDAY_DESCRIPTION_MAX = 500;
export const BREAK_TITLE_MAX = 60;

// Booking slot settings: one entry per slotSettings field, with the
// backend's min/max so the inputs and the zod schema agree with Joi.
export const SLOT_SETTING_FIELDS = [
  {
    name: "slotDurationMinutes",
    label: "Slot length",
    unit: "min",
    min: 15,
    max: 480,
    step: 15,
    hint: "How long one booking slot lasts.",
  },
  {
    name: "bufferMinutes",
    label: "Gap between slots",
    unit: "min",
    min: 0,
    max: 120,
    step: 5,
    hint: "Travel and set-up time for the provider.",
  },
  {
    name: "bookingCutoffHours",
    label: "Book at least",
    unit: "hrs ahead",
    min: 0,
    max: 72,
    step: 1,
    hint: "Latest a customer can book before a slot starts.",
  },
  {
    name: "maxAdvanceBookingDays",
    label: "Book up to",
    unit: "days ahead",
    min: 1,
    max: 365,
    step: 1,
    hint: "How far ahead the calendar opens.",
  },
  {
    name: "maxConcurrentBookingsPerSlot",
    label: "Bookings per slot",
    unit: "max",
    min: 1,
    max: 500,
    step: 1,
    hint: "Customers who can book the same slot.",
  },
];

// --- Time helpers (times are "HH:mm" 24-hour strings, as the backend stores them) ---

export const toMinutes = (time) => {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const pad = (value) => String(value).padStart(2, "0");
export const fromMinutes = (total) => `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;

// "13:30" -> "1:30 PM"
export const formatTime = (time) => {
  const total = toMinutes(time);
  if (total === null) return "—";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${pad(minutes)} ${suffix}`;
};

// 570 -> "9h 30m"
export const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return "0h";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

// Minutes a day is open, breaks taken out.
export const workingMinutes = (day) => {
  if (!day?.isOpen) return 0;
  const open = toMinutes(day.openTime);
  const close = toMinutes(day.closeTime);
  if (open === null || close === null || close <= open) return 0;
  const breakMinutes = (day.breaks ?? []).reduce((sum, item) => {
    const start = Math.max(toMinutes(item.startTime) ?? 0, open);
    const end = Math.min(toMinutes(item.endTime) ?? 0, close);
    return end > start ? sum + (end - start) : sum;
  }, 0);
  return Math.max(close - open - breakMinutes, 0);
};

// Same slot maths as the model's generateSlotsForDate, so the page can
// preview slots for edits that aren't saved yet.
export const buildSlots = (day, settings) => {
  if (!day?.isOpen) return [];
  const open = toMinutes(day.openTime);
  const close = toMinutes(day.closeTime);
  if (open === null || close === null || close <= open) return [];
  const duration = Number(settings?.slotDurationMinutes) || 60;
  // 0 means back-to-back slots; an empty/invalid field falls back to the backend default of 15.
  const rawBuffer = Number(settings?.bufferMinutes);
  const buffer = Number.isFinite(rawBuffer) && rawBuffer >= 0 ? rawBuffer : 15;
  const breaks = (day.breaks ?? [])
    .map((item) => ({ start: toMinutes(item.startTime), end: toMinutes(item.endTime) }))
    .filter((item) => item.start !== null && item.end !== null);

  const slots = [];
  for (let start = open; start + duration <= close; start += duration + buffer) {
    const end = start + duration;
    if (!breaks.some((item) => start < item.end && end > item.start)) {
      slots.push({ startTime: fromMinutes(start), endTime: fromMinutes(end) });
    }
  }
  return slots;
};

// --- Date helpers (holiday dates are "YYYY-MM-DD" strings) ---

export const todayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// Local-midnight Date for a "YYYY-MM-DD" string (new Date("2026-11-01") would be UTC).
export const parseDate = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const DAY_MS = 24 * 60 * 60 * 1000;

// The date a holiday next falls on, today included. A yearly holiday rolls
// over to its next anniversary; a one-off holiday keeps its own date.
export const nextOccurrence = (holiday, today = todayString()) => {
  if (!holiday.recurringAnnually || holiday.date >= today) return holiday.date;
  const monthDay = holiday.date.slice(5);
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}-${monthDay}`;
  return thisYear >= today ? thisYear : `${year + 1}-${monthDay}`;
};

export const daysUntil = (date, today = todayString()) => Math.round((parseDate(date) - parseDate(today)) / DAY_MS);

// "Today", "Tomorrow", "In 12 days", "3 days ago"
export const relativeDayLabel = (date, today = todayString()) => {
  const diff = daysUntil(date, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1) return diff < 60 ? `In ${diff} days` : `In ${Math.round(diff / 30)} months`;
  return -diff < 60 ? `${-diff} days ago` : `${Math.round(-diff / 30)} months ago`;
};

const dateFormat = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const formatLongDate = (date) => dateFormat.format(parseDate(date));
