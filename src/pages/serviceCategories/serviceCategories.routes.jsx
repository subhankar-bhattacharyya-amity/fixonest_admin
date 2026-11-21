import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const ServiceCategoryManagementPage = lazy(() => import("./ServiceCategoryManagementPage.jsx"));

// "Category Management > Service Category" (layouts/sidebar/sidebar.data.js)
// for both management roles. One page, mounted under each role's own
// dashboard path; each path only admits its own role, so an Admin can't open
// the Super Admin URL. The page adapts to the role (the Super Admin also
// picks each category's vertical), and the backend scopes an Admin to the
// categories of their own vertical.
export const serviceCategoryRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [{ path: ROUTES.SUPER_ADMIN_SERVICE_CATEGORIES, element: <ServiceCategoryManagementPage /> }],
  },
  {
    element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
    children: [{ path: ROUTES.ADMIN_SERVICE_CATEGORIES, element: <ServiceCategoryManagementPage /> }],
  },
];
