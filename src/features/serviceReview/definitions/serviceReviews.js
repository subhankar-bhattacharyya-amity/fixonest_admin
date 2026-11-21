import { ROLES } from "@/features/auth/index.js";
import { appConfig } from "@/lib/config.js";

// fixonest_backend/app/router/super_admin/service_reviews_ratings.routes.js and
// app/router/admin/service_reviews_ratings.routes.js - the same
// /v1/service-reviews endpoints under each role's base path. An Admin only
// reaches the reviews of their own vertical's services.
export const SERVICE_REVIEW_API_PATHS = {
  [ROLES.SUPER_ADMIN]: "/super-admin/api/v1/service-reviews",
  [ROLES.ADMIN]: "/admin/api/v1/service-reviews",
};

// The services a review can be added for (the service picker).
export const REVIEW_SERVICE_OPTION_API_PATHS = {
  [ROLES.SUPER_ADMIN]: "/super-admin/api/v1/services",
  [ROLES.ADMIN]: "/admin/api/v1/services",
};
export const REVIEW_SERVICE_OPTION_FETCH_SIZE = 100;

// Review cards per page of the listing (paged and filtered by the server).
export const SERVICE_REVIEWS_PER_PAGE = 12;

// service_reviews_ratings.validator.js's COMMENT_MAX.
export const SERVICE_REVIEW_COMMENT_MAX = 1000;

// Mirrors fixonest_backend/app/constant/status.js: Active = shown on the
// customer site, Inactive = hidden (and left out of the service's average).
export const SERVICE_REVIEW_STATUS = { VISIBLE: "Active", HIDDEN: "Inactive" };

export const SERVICE_REVIEW_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

// What each star count means - shown under the star picker.
export const STAR_LABELS = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very good", 5: "Excellent" };

// Customer photos are stored relative to the backend's public folder; the
// shared placeholder (".../default.png") counts as "no photo" so the avatar
// shows the customer's initials instead.
export const buildCustomerAvatarUrl = (path) => {
  if (!path || /\/default\.(png|jpe?g)$/i.test(path)) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${appConfig.apiBaseUrl}/${path.replace(/^\/+/, "")}`;
};

export const buildServiceThumbUrl = (path) =>
  path ? `${appConfig.apiBaseUrl}/${path.replace(/^\/+/, "")}` : null;

// "2026-10-23" for a date input, in local time.
export const toDateInputValue = (date) => {
  const value = new Date(date);
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

// "3 weeks ago" style text for a review date. `now` is passed in by the caller
// so the function stays pure.
export const formatReviewAge = (date, now) => {
  const days = Math.floor((now - new Date(date).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
};
