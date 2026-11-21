import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const CustomerManagementPage = lazy(() => import("./CustomerManagementPage.jsx"));

// "User Management > Customer Management" (layouts/sidebar/sidebar.data.js).
// Super Admin only - the backend routes customer management under
// /super-admin/api alone, so an Admin has no customer endpoints to call.
export const customerRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [{ path: ROUTES.CUSTOMERS, element: <CustomerManagementPage /> }],
  },
];
