import { BadgeCheck, EyeOff } from "lucide-react";
import { ROLES } from "@/features/auth/index.js";
import { appConfig } from "@/lib/config.js";

// fixonest_backend/app/router/super_admin/service.routes.js and
// app/router/admin/service.routes.js - the same /v1/services endpoints under
// each role's base path. A Super Admin manages every service; an Admin only
// the services whose category belongs to their vertical (the backend pins it).
export const SERVICE_API_PATHS = {
  [ROLES.SUPER_ADMIN]: "/super-admin/api/v1/services",
  [ROLES.ADMIN]: "/admin/api/v1/services",
};

// The categories a service can be filed under - for an Admin, only those of
// their own vertical.
export const SERVICE_CATEGORY_OPTION_API_PATHS = {
  [ROLES.SUPER_ADMIN]: "/super-admin/api/v1/service-categories",
  [ROLES.ADMIN]: "/admin/api/v1/service-categories",
};

// Cards/rows per page of the listing (paged, searched and filtered by the
// server). 12 fills the grid's 1, 2, 3 and 4 column layouts evenly.
export const SERVICES_PER_PAGE = 12;

// Page size used while loading every category for the pickers.
export const SERVICE_CATEGORY_OPTION_FETCH_SIZE = 100;

// Mirrors fixonest_backend/app/constant/status.js.
export const SERVICE_STATUS = { ACTIVE: "Active", INACTIVE: "Inactive" };

export const SERVICE_STATUSES = {
  [SERVICE_STATUS.ACTIVE]: {
    label: "Active",
    icon: BadgeCheck,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    dot: "bg-emerald-500",
  },
  [SERVICE_STATUS.INACTIVE]: {
    label: "Inactive",
    icon: EyeOff,
    badge: "bg-slate-100 text-slate-600 ring-slate-500/15",
    dot: "bg-slate-400",
  },
};

export const getServiceStatus = (status) => SERVICE_STATUSES[status] ?? SERVICE_STATUSES[SERVICE_STATUS.ACTIVE];

// service.repositories.js: at most 6 featured services (the customer site's
// Home grid shows 6) and 10 gallery images per service.
export const SERVICE_FEATURED_LIMIT = 6;
export const SERVICE_GALLERY_LIMIT = 10;

// Same limits as service.validator.js.
export const SERVICE_NAME_MAX = 120;
export const SERVICE_DESCRIPTION_MAX = 300;
export const SERVICE_OVERVIEW_MAX = 5000;
export const SERVICE_DURATION_LABEL_MAX = 60;
export const SERVICE_LIST_ITEM_MAX = 200;
export const SERVICE_LIST_LIMIT = 20;

// Upload constraints mirroring fixonest_backend/app/middleware/multer.js's
// ALLOWED_MIMETYPES and DEFAULT_FILE_SIZE_LIMIT.
export const SERVICE_IMAGE_TYPES = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
export const SERVICE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

// The multipart fields the backend's service uploaders read files from.
export const SERVICE_COVER_FIELD = "image_url";
export const SERVICE_GALLERY_FIELD = "service_images";
export const SERVICE_SINGLE_IMAGE_FIELD = "image_url";

// The list fields saved in ServiceDetails. Sent as "field[]" in multipart.
export const SERVICE_LIST_FIELDS = ["whatYouGet", "packageBenefits", "skills"];

// The backend's `sort` presets (service.repositories.js parseSortCriteria).
export const SERVICE_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "low_to_high", label: "Price: low to high" },
  { value: "high_to_low", label: "Price: high to low" },
  { value: "top_rated", label: "Top rated" },
  { value: "a_z", label: "Name: A to Z" },
];

// Image paths are stored relative to the backend's public folder
// ("uploads/services/<file>"); null when there is no image.
export const buildServiceImageUrl = (path) => (path ? `${appConfig.apiBaseUrl}/${path.replace(/^\/+/, "")}` : null);

// 1499 -> "₹1,499", Indian digit grouping like the customer site.
export const formatServicePrice = (value) => `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

// What a customer pays, the struck-through full price (when discounted) and
// the rounded percentage off. discountPrice is the discounted selling price,
// 0 when there is no discount.
export const getServicePricing = ({ price, discountPrice } = {}) => {
  const full = Number(price) || 0;
  const discounted = Number(discountPrice) || 0;
  const hasDiscount = discounted > 0 && discounted < full;
  return {
    finalPrice: hasDiscount ? discounted : full,
    originalPrice: hasDiscount ? full : null,
    percentOff: hasDiscount ? Math.round(((full - discounted) / full) * 100) : 0,
  };
};

// 90 -> "1 hr 30 min". Empty for 0.
export const formatServiceDuration = (minutes) => {
  const total = Math.round(Number(minutes) || 0);
  if (total <= 0) return "";
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr${hours > 1 ? "s" : ""}`;
};
