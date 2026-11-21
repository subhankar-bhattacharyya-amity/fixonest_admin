import { BadgeCheck, EyeOff } from "lucide-react";
import { ROLES } from "@/features/auth/index.js";
import { appConfig } from "@/lib/config.js";

// fixonest_backend/app/router/super_admin/service_category.routes.js and
// app/router/admin/service_category.routes.js - the same /v1/service-categories
// endpoints under each role's base path. A Super Admin manages categories in
// every vertical; an Admin only those of their own vertical (the backend pins
// every Admin request to it).
export const SERVICE_CATEGORY_API_PATHS = {
  [ROLES.SUPER_ADMIN]: "/super-admin/api/v1/service-categories",
  [ROLES.ADMIN]: "/admin/api/v1/service-categories",
};

// Rows shown per page of the listing (paged in the browser - see
// serviceCategorySlice.js's fetchServiceCategories).
export const SERVICE_CATEGORIES_PER_PAGE = 10;

// Page size used while loading the whole catalogue; the backend caps per_page
// server-side anyway.
export const SERVICE_CATEGORY_FETCH_SIZE = 100;

// Mirrors fixonest_backend/app/constant/status.js.
export const SERVICE_CATEGORY_STATUS = { ACTIVE: "Active", INACTIVE: "Inactive" };

export const SERVICE_CATEGORY_STATUSES = {
  [SERVICE_CATEGORY_STATUS.ACTIVE]: {
    label: "Active",
    icon: BadgeCheck,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    dot: "bg-emerald-500",
  },
  [SERVICE_CATEGORY_STATUS.INACTIVE]: {
    label: "Inactive",
    icon: EyeOff,
    badge: "bg-slate-100 text-slate-600 ring-slate-500/15",
    dot: "bg-slate-400",
  },
};

export const getServiceCategoryStatus = (status) =>
  SERVICE_CATEGORY_STATUSES[status] ?? SERVICE_CATEGORY_STATUSES[SERVICE_CATEGORY_STATUS.ACTIVE];

// service_category.validator.js caps the name at 120; the description has no
// server-side limit, so this one only keeps the listing readable.
export const SERVICE_CATEGORY_NAME_MAX = 120;
export const SERVICE_CATEGORY_DESCRIPTION_MAX = 1000;

// Upload constraints mirroring fixonest_backend/app/middleware/multer.js's
// ALLOWED_MIMETYPES and DEFAULT_FILE_SIZE_LIMIT, so a bad file is rejected
// instantly instead of round-tripping to the server first.
export const SERVICE_CATEGORY_ICON_TYPES = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
export const SERVICE_CATEGORY_ICON_MAX_BYTES = 5 * 1024 * 1024;

// The multipart field the backend's uploadServiceCategoryIcon reads the file from.
export const SERVICE_CATEGORY_ICON_FIELD = "icon_url";

// icon_url is stored relative to the backend's public folder
// ("uploads/service_categories/<file>"); null when the category has no icon.
export const buildServiceCategoryIconUrl = (category) =>
  category?.icon_url ? `${appConfig.apiBaseUrl}/${category.icon_url.replace(/^\/+/, "")}` : null;
