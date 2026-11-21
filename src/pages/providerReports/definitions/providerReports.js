// Provider "Reports": report periods and every number the page shows,
// calculated from the provider's bookings (features/providerBooking - DUMMY
// data for now), so Reports, the Dashboard and My Bookings always agree.
import { formatBookingNumber, getBookingStart } from "@/features/providerBooking/index.js";

const DAY = 86400000;

export const REPORT_PERIODS = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "90d", label: "90 days" },
];

export const DEFAULT_PERIOD = "30d";

const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const rangeLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

// { from, to } (to is exclusive) for a period, plus the same-length period
// just before it for "vs previous" comparisons.
export const getPeriodRange = (key, now = new Date()) => {
  const tomorrow = new Date(startOfDay(now).getTime() + DAY);
  let from;
  let to = tomorrow;
  if (key === "7d") from = new Date(tomorrow.getTime() - 7 * DAY);
  else if (key === "90d") from = new Date(tomorrow.getTime() - 90 * DAY);
  else if (key === "month") from = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (key === "lastMonth") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 1);
  } else from = new Date(tomorrow.getTime() - 30 * DAY);

  const length = to - from;
  return {
    from,
    to,
    previous: { from: new Date(from.getTime() - length), to: from },
    label: `${rangeLabel.format(from)} – ${rangeLabel.format(new Date(to.getTime() - 1))}`,
  };
};

const within = (date, range) => date >= range.from && date < range.to;
const total = (list, pick) => list.reduce((sum, item) => sum + pick(item), 0);
const paidIn = (bookings, range) =>
  bookings.filter((booking) => booking.cashPayment && within(new Date(booking.cashPayment.receivedAt), range));

// Accepted vs rejected answers the provider gave in the range (from each
// booking's activity log).
const responsesIn = (bookings, range) => {
  let accepted = 0;
  let rejected = 0;
  bookings.forEach((booking) =>
    booking.activity.forEach((entry) => {
      if (entry.actor !== "provider" || !within(new Date(entry.at), range)) return;
      if (entry.status === "accepted") accepted += 1;
      if (entry.status === "rejected") rejected += 1;
    }),
  );
  return { accepted, rejected, rate: accepted + rejected ? Math.round((accepted / (accepted + rejected)) * 100) : null };
};

// % change, or null when there's nothing to compare with.
const change = (current, previous) => (previous ? Math.round(((current - previous) / previous) * 100) : null);

const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Earnings per day (or per week for ranges longer than 31 days), up to today.
const buildTrend = (paid, range, now) => {
  const end = Math.min(range.to.getTime(), startOfDay(now).getTime() + DAY);
  const days = Math.max(Math.round((end - range.from.getTime()) / DAY), 1);
  const step = days > 31 ? 7 : 1;
  const points = [];
  for (let start = range.from.getTime(); start < end; start += step * DAY) {
    const bucket = { from: new Date(start), to: new Date(Math.min(start + step * DAY, end)) };
    const inBucket = paid.filter((booking) => within(new Date(booking.cashPayment.receivedAt), bucket));
    points.push({
      label: step === 7 ? `Wk of ${dayLabel.format(bucket.from)}` : dayLabel.format(bucket.from),
      earnings: total(inBucket, (booking) => booking.pricing.earning),
      cash: total(inBucket, (booking) => booking.cashPayment.amountReceived),
      jobs: inBucket.length,
    });
  }
  return { points, grouping: step === 7 ? "week" : "day" };
};

export const buildProviderReport = (bookings, periodKey, now = new Date()) => {
  const range = getPeriodRange(periodKey, now);
  const paid = paidIn(bookings, range).sort((a, b) => new Date(b.cashPayment.receivedAt) - new Date(a.cashPayment.receivedAt));
  const previousPaid = paidIn(bookings, range.previous);

  const gross = total(paid, (booking) => booking.cashPayment.amountReceived);
  const commission = total(paid, (booking) => booking.pricing.commission);
  const earnings = total(paid, (booking) => booking.pricing.earning);
  const previousEarnings = total(previousPaid, (booking) => booking.pricing.earning);
  const previousGross = total(previousPaid, (booking) => booking.cashPayment.amountReceived);

  // Visits that fell in the range, by how they ended up.
  const visits = bookings.filter((booking) => within(getBookingStart(booking), range));
  const outcomes = ["paid", "completed", "in_progress", "accepted", "pending", "rejected", "cancelled"]
    .map((status) => ({ status, value: visits.filter((booking) => booking.status === status).length }))
    .filter((row) => row.value > 0);

  const services = Object.values(
    paid.reduce((groups, booking) => {
      const key = booking.service.name;
      const group = groups[key] ?? { name: key, category: booking.service.category, jobs: 0, cash: 0, earnings: 0 };
      group.jobs += 1;
      group.cash += booking.cashPayment.amountReceived;
      group.earnings += booking.pricing.earning;
      return { ...groups, [key]: group };
    }, {}),
  ).sort((a, b) => b.earnings - a.earnings);

  const weekdays = WEEKDAYS.map((label, index) => ({
    label,
    jobs: visits.filter((booking) => !["rejected", "cancelled"].includes(booking.status) && (getBookingStart(booking).getDay() + 6) % 7 === index).length,
  }));

  const responses = responsesIn(bookings, range);
  const previousResponses = responsesIn(bookings, range.previous);

  return {
    range,
    paid,
    gross,
    commission,
    earnings,
    jobs: paid.length,
    averageJob: paid.length ? Math.round(gross / paid.length) : 0,
    hours: total(paid, (booking) => booking.hours),
    earningsChange: change(earnings, previousEarnings),
    grossChange: change(gross, previousGross),
    jobsChange: change(paid.length, previousPaid.length),
    responses,
    rateChange: responses.rate !== null && previousResponses.rate !== null ? responses.rate - previousResponses.rate : null,
    outcomes,
    services,
    weekdays,
    trend: buildTrend(paid, range, now),
  };
};

// Downloads the period's paid bookings as a CSV file (opens in Excel / Sheets).
export const downloadReportCsv = (report, periodLabel) => {
  const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [];

  // Report Header
  lines.push(["FIXONEST - PROVIDER PERFORMANCE & EARNINGS REPORT"].map(escapeCell).join(","));
  lines.push(["Reporting Period", report.range?.label || periodLabel || ""].map(escapeCell).join(","));
  lines.push(["Generated On", new Date().toLocaleString("en-IN")].map(escapeCell).join(","));
  lines.push([]);

  // Executive Summary
  lines.push(["EXECUTIVE SUMMARY"].map(escapeCell).join(","));
  lines.push(["Net Earnings (INR)", report.earnings || 0].map(escapeCell).join(","));
  lines.push(["Cash Collected (INR)", report.gross || 0].map(escapeCell).join(","));
  lines.push(["Platform Commission (INR)", report.commission || 0].map(escapeCell).join(","));
  lines.push(["Jobs Completed", report.jobs || 0].map(escapeCell).join(","));
  lines.push(["Average Per Job (INR)", report.averageJob || 0].map(escapeCell).join(","));
  lines.push(["Total Visit Hours", report.hours || 0].map(escapeCell).join(","));
  lines.push([
    "Acceptance Rate (%)",
    report.responses?.rate !== null && report.responses?.rate !== undefined
      ? `${report.responses.rate}%`
      : "—",
  ].map(escapeCell).join(","));
  lines.push([]);

  // Service Breakdown
  if (report.services && report.services.length > 0) {
    lines.push(["EARNINGS BY SERVICE"].map(escapeCell).join(","));
    lines.push([
      "Service",
      "Category",
      "Completed Jobs",
      "Cash Collected (INR)",
      "Net Earnings (INR)",
    ].map(escapeCell).join(","));
    report.services.forEach((s) => {
      lines.push([s.name, s.category, s.jobs, s.cash, s.earnings].map(escapeCell).join(","));
    });
    lines.push([]);
  }

  // Itemized Transactions
  lines.push(["ITEMIZED TRANSACTIONS"].map(escapeCell).join(","));
  const header = [
    "Booking Number",
    "Completed Date",
    "Service",
    "Category",
    "Customer",
    "Cash Collected (INR)",
    "Commission (INR)",
    "Net Earning (INR)",
  ];
  lines.push(header.map(escapeCell).join(","));

  const rows = (report.paid || []).map((b) => [
    b.bookingNumber || formatBookingNumber(b) || "—",
    b.completedAt
      ? new Date(b.completedAt).toLocaleString("en-IN")
      : b.cashPayment?.receivedAt
        ? new Date(b.cashPayment.receivedAt).toLocaleString("en-IN")
        : "—",
    b.serviceTitle || b.service?.name || "Service",
    b.categoryTitle || b.service?.category || "General",
    b.customerName || b.customer?.name || "Customer",
    b.gross ?? b.cashPayment?.amountReceived ?? 0,
    b.commission ?? b.pricing?.commission ?? b.pricing?.platformFee ?? 0,
    b.earnings ?? b.pricing?.earning ?? b.pricing?.providerEarnings ?? 0,
  ]);
  rows.forEach((r) => lines.push(r.map(escapeCell).join(",")));

  lines.push([
    "Total",
    "",
    "",
    "",
    "",
    report.gross || 0,
    report.commission || 0,
    report.earnings || 0,
  ].map(escapeCell).join(","));

  const csvBody = lines.map((line) => (Array.isArray(line) ? line.join(",") : line)).join("\r\n");
  const blob = new Blob([String.fromCharCode(0xfeff) + csvBody], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const filename = `fixonest-earnings-${(periodLabel || "report").toLowerCase().replace(/\s+/g, "-")}.csv`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 3000);
};
