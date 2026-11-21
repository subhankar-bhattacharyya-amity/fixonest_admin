import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const ServiceManagementPage = lazy(() => import("./ServiceManagementPage.jsx"));
const ServiceEditorPage = lazy(() => import("./ServiceEditorPage.jsx"));

// "Service Management" (layouts/sidebar/sidebar.data.js) for both management
// roles: the listing, plus one editor page that creates a service (/new) or
// edits one (/:serviceId/edit). Mounted under each role's own dashboard path;
// each path only admits its own role. An Admin only sees the services of
// their own vertical (the backend scopes every request).
export const serviceRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [
      { path: ROUTES.SUPER_ADMIN_SERVICES, element: <ServiceManagementPage /> },
      { path: ROUTES.SUPER_ADMIN_SERVICE_CREATE, element: <ServiceEditorPage /> },
      { path: ROUTES.SUPER_ADMIN_SERVICE_EDIT, element: <ServiceEditorPage /> },
    ],
  },
  {
    element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
    children: [
      { path: ROUTES.ADMIN_SERVICES, element: <ServiceManagementPage /> },
      { path: ROUTES.ADMIN_SERVICE_CREATE, element: <ServiceEditorPage /> },
      { path: ROUTES.ADMIN_SERVICE_EDIT, element: <ServiceEditorPage /> },
    ],
  },
];
