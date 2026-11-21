import { BadgeCheck, PauseCircle } from "lucide-react";
import { ROLES } from "@/features/auth/index.js";

// fixonest_backend/app/router/super_admin/providers.routes.js and
// app/router/admin/providers.routes.js - the same /v1/providers endpoints
// under each role's base path. The Super Admin creates providers (with a
// password) and can delete them; both roles list, edit and suspend/reactivate
// them. Providers are not tied to verticals - they are assigned to service
// categories, and the backend limits an Admin to providers assigned to a
// category of the Admin's own vertical. There is no registration or approval.
export const PROVIDER_API_PATHS = {
  [ROLES.SUPER_ADMIN]: "/super-admin/api/v1/providers",
  [ROLES.ADMIN]: "/admin/api/v1/providers",
};

export const PROVIDERS_PER_PAGE = 10;

// accountStatus of a live provider ("deactivated" = soft-deleted; never listed).
export const ACCOUNT_STATUSES = {
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

export const getAccountStatus = (status) => ACCOUNT_STATUSES[status] ?? ACCOUNT_STATUSES.active;
