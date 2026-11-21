import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const ProviderManagementPage = lazy(() => import("./ProviderManagementPage.jsx"));

// "User Management > Provider Management" (layouts/sidebar/sidebar.data.js)
// for both management roles. One page, mounted under each role's own
// dashboard path; each path only admits its own role, so an Admin can't open
// the Super Admin URL. The page adapts to the role (the Super Admin also
// creates and deletes providers), and the backend scopes an Admin to
// providers assigned to a service category of their own vertical.
export const providerRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [{ path: ROUTES.SUPER_ADMIN_PROVIDERS, element: <ProviderManagementPage /> }],
  },
  {
    element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
    children: [{ path: ROUTES.ADMIN_PROVIDERS, element: <ProviderManagementPage /> }],
  },
];
