import { ROLES } from "@/features/auth/index.js";

// fixonest_backend/app/router/super_admin/dashboard.routes.js and
// app/router/admin/dashboard.routes.js - the same /v1/dashboard endpoints
// under each role's base path.
export const DASHBOARD_API_PATHS = {
  [ROLES.SUPER_ADMIN]: "/super-admin/api/v1/dashboard",
  [ROLES.ADMIN]: "/admin/api/v1/dashboard",
  [ROLES.PROVIDER]: "/provider/api/v1/dashboard",
};

// How many of the newest contact messages the dashboard's "Recent Contacts"
// card lists.
export const RECENT_CONTACTS_LIMIT = 5;
