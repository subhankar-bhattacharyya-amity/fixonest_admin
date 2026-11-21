import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const SuperAdminDashboardPage = lazy(() => import("./SuperAdminDashboardPage.jsx"));
const AdminDashboardPage = lazy(() => import("./AdminDashboardPage.jsx"));
const ProviderDashboardPage = lazy(() => import("./ProviderDashboardPage.jsx"));

// One dashboard per role, each behind a RoleGuard so a role can only open
// its own (anyone else is sent back to theirs).
export const dashboardRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [{ path: ROUTES.SUPER_ADMIN_DASHBOARD, element: <SuperAdminDashboardPage /> }],
  },
  {
    element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
    children: [{ path: ROUTES.ADMIN_DASHBOARD, element: <AdminDashboardPage /> }],
  },
  {
    element: <RoleGuard allowedRoles={[ROLES.PROVIDER]} />,
    children: [{ path: ROUTES.PROVIDER_DASHBOARD, element: <ProviderDashboardPage /> }],
  },
  // Provider pages lived under /dashboard/technician until 2026-10-27 - send
  // old bookmarks to the provider dashboard.
  { path: `${ROUTES.LEGACY_TECHNICIAN_DASHBOARD}/*`, element: <Navigate to={ROUTES.PROVIDER_DASHBOARD} replace /> },
];
