import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const TeamManagementPage = lazy(() => import("./TeamManagementPage.jsx"));

// "Team Management" (layouts/sidebar/sidebar.data.js). Super Admin only -
// the backend's team management API is Super Admin only.
export const teamMemberRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [{ path: ROUTES.TEAM_MEMBERS, element: <TeamManagementPage /> }],
  },
];
