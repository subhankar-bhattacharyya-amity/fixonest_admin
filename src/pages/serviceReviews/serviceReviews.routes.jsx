import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const ServiceReviewManagementPage = lazy(() => import("./ServiceReviewManagementPage.jsx"));

// "Reviews & Ratings Management" (layouts/sidebar/sidebar.data.js) for both
// management roles, under each role's own dashboard path. An Admin only sees
// the reviews of their own vertical's services (the backend scopes it).
export const serviceReviewRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [{ path: ROUTES.SUPER_ADMIN_SERVICE_REVIEWS, element: <ServiceReviewManagementPage /> }],
  },
  {
    element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
    children: [{ path: ROUTES.ADMIN_SERVICE_REVIEWS, element: <ServiceReviewManagementPage /> }],
  },
];
