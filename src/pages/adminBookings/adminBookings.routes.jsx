import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const AdminBookingsPage = lazy(() => import("./AdminBookingsPage.jsx"));
const AdminBookingDetailsPage = lazy(() => import("./AdminBookingDetailsPage.jsx"));

// "Booking Management" (layouts/sidebar/sidebar.data.js). One pair of pages,
// mounted under each role's own dashboard path; each path only admits its own
// role. The Super Admin sees every vertical, an Admin only their own.
export const adminBookingRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [
      { path: ROUTES.SUPER_ADMIN_BOOKINGS, element: <AdminBookingsPage /> },
      { path: ROUTES.SUPER_ADMIN_BOOKING_DETAILS, element: <AdminBookingDetailsPage /> },
    ],
  },
  {
    element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
    children: [
      { path: ROUTES.ADMIN_BOOKINGS, element: <AdminBookingsPage /> },
      { path: ROUTES.ADMIN_BOOKING_DETAILS, element: <AdminBookingDetailsPage /> },
    ],
  },
];
