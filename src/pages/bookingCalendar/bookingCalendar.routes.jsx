import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const BookingCalendarPage = lazy(() => import("./BookingCalendarPage.jsx"));

// "Booking Calendar" (layouts/sidebar/sidebar.data.js, right above My
// Bookings) - providers only.
export const bookingCalendarRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.PROVIDER]} />,
    children: [{ path: ROUTES.PROVIDER_BOOKING_CALENDAR, element: <BookingCalendarPage /> }],
  },
];
