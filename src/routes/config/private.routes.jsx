import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/layouts/dashboard/index.js";
import { dashboardRoutes } from "@/pages/dashboard/dashboard.routes.jsx";
import { settingsRoutes } from "@/pages/settings/settings.routes.jsx";
import { profileRoutes } from "@/pages/profile/profile.routes.jsx";
import { verticalRoutes } from "@/pages/verticals/verticals.routes.jsx";
import { verticalAdminRoutes } from "@/pages/verticalAdmins/verticalAdmins.routes.jsx";
import { providerRoutes } from "@/pages/providers/providers.routes.jsx";
import { customerRoutes } from "@/pages/customers/customers.routes.jsx";
import { serviceCategoryRoutes } from "@/pages/serviceCategories/serviceCategories.routes.jsx";
import { blogCategoryRoutes } from "@/pages/blogCategories/blogCategories.routes.jsx";
import { blogRoutes } from "@/pages/blogs/blogs.routes.jsx";
import { serviceRoutes } from "@/pages/services/services.routes.jsx";
import { serviceReviewRoutes } from "@/pages/serviceReviews/serviceReviews.routes.jsx";
import { testimonialRoutes } from "@/pages/testimonials/testimonials.routes.jsx";
import { faqRoutes } from "@/pages/faqs/faqs.routes.jsx";
import { providerAssignmentRoutes } from "@/pages/providerAssignments/providerAssignments.routes.jsx";
import { teamMemberRoutes } from "@/pages/teamMembers/teamMembers.routes.jsx";
import { contactRoutes } from "@/pages/contacts/contacts.routes.jsx";
import { providerBookingRoutes } from "@/pages/providerBookings/providerBookings.routes.jsx";
import { bookingCalendarRoutes } from "@/pages/bookingCalendar/bookingCalendar.routes.jsx";
import { adminBookingRoutes } from "@/pages/adminBookings/adminBookings.routes.jsx";
import { providerReportRoutes } from "@/pages/providerReports/providerReports.routes.jsx";
import AuthGuard from "../guards/AuthGuard.jsx";
import { ROUTES } from "../constants.js";

// Every page behind a login lives here, inside the shared sidebar/topbar
// DashboardLayout. Role-specific pages add their own RoleGuard in their
// page's *.routes.jsx (see pages/dashboard/dashboard.routes.jsx).
export const privateRoutes = {
  element: <AuthGuard />,
  children: [
    {
      element: <DashboardLayout />,
      children: [
        ...dashboardRoutes,
        ...settingsRoutes,
        ...profileRoutes,
        ...verticalRoutes,
        ...verticalAdminRoutes,
        ...providerRoutes,
        ...customerRoutes,
        ...serviceCategoryRoutes,
        ...blogCategoryRoutes,
        ...blogRoutes,
        ...serviceRoutes,
        ...serviceReviewRoutes,
        ...testimonialRoutes,
        ...faqRoutes,
        ...providerAssignmentRoutes,
        ...teamMemberRoutes,
        ...contactRoutes,
        ...providerBookingRoutes,
        ...bookingCalendarRoutes,
        ...adminBookingRoutes,
        ...providerReportRoutes,
        { path: ROUTES.DASHBOARD, element: <Navigate to={ROUTES.LOGIN} replace /> },
      ],
    },
  ],
};
