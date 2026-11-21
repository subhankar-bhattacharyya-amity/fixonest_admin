import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const VerticalManagementPage = lazy(() => import("./VerticalManagementPage.jsx"));

// Super Admin only - same roles as the "Vertical Management" sidebar item
// (layouts/sidebar/sidebar.data.js) and the backend's vertical routes.
export const verticalRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [{ path: ROUTES.VERTICALS, element: <VerticalManagementPage /> }],
  },
];
