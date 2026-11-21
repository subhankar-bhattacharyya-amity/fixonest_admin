import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const ProviderBookingsPage = lazy(() => import("./ProviderBookingsPage.jsx"));
const ProviderBookingDetailsPage = lazy(() => import("./ProviderBookingDetailsPage.jsx"));

// "My Bookings" (layouts/sidebar/sidebar.data.js) and one booking's details
// page - providers only. The old "My Tasks" URL redirects here.
export const providerBookingRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.PROVIDER]} />,
    children: [
      { path: ROUTES.PROVIDER_BOOKINGS, element: <ProviderBookingsPage /> },
      { path: ROUTES.PROVIDER_BOOKING_DETAILS, element: <ProviderBookingDetailsPage /> },
      { path: ROUTES.LEGACY_PROVIDER_TASKS, element: <Navigate to={ROUTES.PROVIDER_BOOKINGS} replace /> },
    ],
  },
];
