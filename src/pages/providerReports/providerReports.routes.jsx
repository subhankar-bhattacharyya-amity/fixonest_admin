import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const ProviderReportsPage = lazy(() => import("./ProviderReportsPage.jsx"));

// "Reports" (layouts/sidebar/sidebar.data.js) - providers only.
export const providerReportRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.PROVIDER]} />,
    children: [{ path: ROUTES.PROVIDER_REPORTS, element: <ProviderReportsPage /> }],
  },
];
