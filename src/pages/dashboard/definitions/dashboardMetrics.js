// Numbers and chart series the dashboards calculate from bookings (the
// provider's "My Bookings" or Booking Management data), so every dashboard
// agrees with the booking pages.
import { getBookingStart } from "@/features/providerBooking/index.js";

const DAY = 86400000;
const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "short" });

export const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

// Monday 00:00 of the week `date` is in.
export const startOfWeek = (date) => {
  const day = startOfDay(date);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
};

export const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

export const isThisMonth = (date, now) => date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

const isClosed = (booking) => booking.status === "rejected" || booking.status === "cancelled";

// Cash recorded this month (paid bookings, by the day the cash came in).
export const paidThisMonth = (bookings, now) =>
  bookings.filter(
    (booking) =>
      (booking.status === "paid" || (booking.status === "completed" && booking.paymentStatus === "paid")) &&
      booking.cashPayment &&
      isThisMonth(new Date(booking.cashPayment.receivedAt), now),
  );

export const sum = (list, pick) => list.reduce((total, item) => total + pick(item), 0);

// Bookings with a visit in [from, to).
const visitsBetween = (bookings, from, to) =>
  bookings.filter((booking) => {
    const start = getBookingStart(booking);
    return start >= from && start < to;
  });

// "+12%" style change between this week's and last week's visits, or null.
export const weekOverWeek = (bookings, now) => {
  const thisWeek = startOfWeek(now);
  const lastWeek = new Date(thisWeek.getTime() - 7 * DAY);
  const nextWeek = new Date(thisWeek.getTime() + 7 * DAY);
  const current = visitsBetween(bookings, thisWeek, nextWeek).length;
  const previous = visitsBetween(bookings, lastWeek, thisWeek).length;
  if (!previous) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  return { value: `${change >= 0 ? "+" : ""}${change}% vs last week`, positive: change >= 0 };
};

// The last `weeks` weeks up to this one: visits per week and cash collected
// that week (₹). For the Super Admin's trend chart.
export const buildWeeklyTrend = (bookings, now, weeks = 6) => {
  const thisWeek = startOfWeek(now);
  return Array.from({ length: weeks }, (_, index) => {
    const from = new Date(thisWeek.getTime() - (weeks - 1 - index) * 7 * DAY);
    const to = new Date(from.getTime() + 7 * DAY);
    const visits = visitsBetween(bookings, from, to).filter((booking) => !isClosed(booking));
    const cash = bookings
      .filter((booking) => booking.cashPayment)
      .filter((booking) => {
        const at = new Date(booking.cashPayment.receivedAt);
        return at >= from && at < to;
      });
    return {
      label: index === weeks - 1 ? "This week" : shortDate.format(from),
      bookings: visits.length,
      cash: sum(cash, (booking) => booking.cashPayment.amountReceived),
    };
  });
};

// Monday-Sunday of this week: visits done (completed / paid) and still to
// come (requested / accepted / in progress) per day. For the Admin's chart.
export const buildThisWeekVisits = (bookings, now) => {
  const monday = startOfWeek(now);
  return Array.from({ length: 7 }, (_, index) => {
    const from = new Date(monday.getTime() + index * DAY);
    const to = new Date(from.getTime() + DAY);
    const visits = visitsBetween(bookings, from, to);
    return {
      label: isSameDay(from, now) ? "Today" : weekday.format(from),
      done: visits.filter((booking) => booking.status === "completed" || booking.status === "paid").length,
      upcoming: visits.filter((booking) => ["pending", "accepted", "upcoming", "in_progress"].includes(booking.status)).length,
    };
  });
};

// The last `days` days up to today: what the provider earned (after
// commission) from cash recorded that day, and how many jobs that was.
export const buildDailyEarnings = (bookings, now, days = 7) => {
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, index) => {
    const from = new Date(today.getTime() - (days - 1 - index) * DAY);
    const to = new Date(from.getTime() + DAY);
    const paid = bookings.filter((booking) => {
      if (!booking.cashPayment) return false;
      const at = new Date(booking.cashPayment.receivedAt);
      return at >= from && at < to;
    });
    return {
      label: index === days - 1 ? "Today" : weekday.format(from),
      earnings: sum(paid, (booking) => booking.pricing.earning),
      jobs: paid.length,
    };
  });
};

// ₹6,64,900 -> "₹6.6L", ₹12,400 -> "₹12k" - for chart axes.
export const formatCompactMoney = (value) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
  return `₹${value}`;
};
