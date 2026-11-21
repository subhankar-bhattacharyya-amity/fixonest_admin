// Utilities are small, framework-independent helper functions.
export function formatDate(date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

// e.g. "Sep 27, 2026, 10:45 PM". Accepts a Date or an ISO string from the API.
export function formatDateTime(date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

// e.g. "Just now", "12m ago", "3h ago", "Yesterday", "4d ago", then the plain
// date once it's a week old. `now` is a timestamp passed in by the caller so
// the function stays pure.
export function formatRelativeTime(date, now) {
  const then = new Date(date);
  const minutes = Math.floor((now - then.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return formatDate(then);
}
