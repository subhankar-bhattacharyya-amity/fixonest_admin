import { BadgeCheck, EyeOff } from "lucide-react";
import { appConfig } from "@/lib/config.js";

// fixonest_backend/app/router/super_admin/testimonials.routes.js - Super Admin only.
export const TESTIMONIAL_API_PATH = "/super-admin/api/v1/testimonials";

// Page size used while loading every testimonial (the backend caps per_page
// at 100). There are only a handful, so the page loads them all and
// searches, filters and reorders them in the browser.
export const TESTIMONIAL_FETCH_SIZE = 100;

// Mirrors fixonest_backend/app/constant/status.js.
export const TESTIMONIAL_STATUS = { ACTIVE: "Active", INACTIVE: "Inactive" };

export const TESTIMONIAL_STATUSES = {
  [TESTIMONIAL_STATUS.ACTIVE]: {
    label: "Live",
    icon: BadgeCheck,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    dot: "bg-emerald-500",
  },
  [TESTIMONIAL_STATUS.INACTIVE]: {
    label: "Hidden",
    icon: EyeOff,
    badge: "bg-slate-100 text-slate-600 ring-slate-500/15",
    dot: "bg-slate-400",
  },
};

export const getTestimonialStatus = (status) =>
  TESTIMONIAL_STATUSES[status] ?? TESTIMONIAL_STATUSES[TESTIMONIAL_STATUS.ACTIVE];

// Limits from testimonials.validator.js.
export const TESTIMONIAL_NAME_MAX = 100;
export const TESTIMONIAL_LOCATION_MAX = 100;
export const TESTIMONIAL_SERVICE_MAX = 100;
export const TESTIMONIAL_QUOTE_MAX = 1000;

// What the rating stars mean, shown under the picker.
export const RATING_LABELS = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very good", 5: "Excellent" };

// The photo: the multipart field the backend's uploadTestimonialAvatar reads,
// and the types/size its multer config accepts.
export const TESTIMONIAL_AVATAR_FIELD = "avatar";
export const TESTIMONIAL_AVATAR_TYPES = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
export const TESTIMONIAL_AVATAR_MAX_BYTES = 5 * 1024 * 1024;

// `avatar` is an upload path served by the backend
// ("uploads/testimonials/<file>") or an absolute http(s) URL. null when empty.
export const buildTestimonialAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  return `${appConfig.apiBaseUrl}/${avatar.replace(/^\/+/, "")}`;
};
