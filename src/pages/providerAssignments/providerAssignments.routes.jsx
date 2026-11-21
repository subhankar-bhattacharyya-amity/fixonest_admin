import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const ProviderAssignmentPage = lazy(() => import("./ProviderAssignmentPage.jsx"));

// "Assignment Management > Provider" (layouts/sidebar/sidebar.data.js) for
// both management roles. One page, mounted under each role's own dashboard
// path; each path only admits its own role, so an Admin can't open the Super
// Admin URL. The backend scopes an Admin to their own vertical's providers
// and service categories.
export const providerAssignmentRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [{ path: ROUTES.SUPER_ADMIN_PROVIDER_ASSIGNMENTS, element: <ProviderAssignmentPage /> }],
  },
  {
    element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
    children: [{ path: ROUTES.ADMIN_PROVIDER_ASSIGNMENTS, element: <ProviderAssignmentPage /> }],
  },
];
