import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const VerticalAdminManagementPage = lazy(() => import("./VerticalAdminManagementPage.jsx"));

// Super Admin only - same roles as the "User Management > Admin Management"
// sidebar item (layouts/sidebar/sidebar.data.js) and the backend's
// vertical.admin.routes.js.
export const verticalAdminRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [{ path: ROUTES.VERTICAL_ADMINS, element: <VerticalAdminManagementPage /> }],
  },
];
