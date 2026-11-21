import { BadgeCheck, PauseCircle } from "lucide-react";

// fixonest_backend/app/router/super_admin/vertical.admin.routes.js - every
// endpoint requires a Super Admin token. Details/update/status/delete take the
// admin's id in the request BODY, never the URL.
export const VERTICAL_ADMIN_API_PATH = "/super-admin/api/v1/admins";

// Page size for the main listing.
export const VERTICAL_ADMINS_PER_PAGE = 10;

// Page size for the overview (stat cards + coverage board) - the backend's
// per_page cap. A vertical can have any number of admins, so the overview
// thunk keeps fetching pages of this size until it has all of them.
export const VERTICAL_ADMIN_OVERVIEW_LIMIT = 100;

// The two statuses a live admin can be in. ("deactivated" = soft-deleted;
// the backend never returns those admins.)
export const ADMIN_STATUSES = {
  active: {
    label: "Active",
    icon: BadgeCheck,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    dot: "bg-emerald-500",
  },
  suspended: {
    label: "Suspended",
    icon: PauseCircle,
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
};

// Password strength meter + generator now live in utils/password.js (shared
// with the provider form); re-exported here so this feature's public API is
// unchanged.
export { PASSWORD_STRENGTH_LEVELS, getPasswordStrength, generateStrongPassword } from "@/utils/password.js";

export const getAdminStatus =(status) => ADMIN_STATUSES[status] ?? ADMIN_STATUSES.active;

// The listing populates vertical_id with { _id, name, display_name }; this
// also tolerates a bare id (e.g. straight after create, before a refetch).
export const getAdminVerticalId = (admin) => admin?.vertical_id?._id ?? admin?.vertical_id ?? null;
