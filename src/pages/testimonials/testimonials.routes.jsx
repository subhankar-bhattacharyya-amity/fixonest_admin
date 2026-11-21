import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const TestimonialManagementPage = lazy(() => import("./TestimonialManagementPage.jsx"));

// "Testimonial Management" (layouts/sidebar/sidebar.data.js). Super Admin
// only - the backend's testimonial management API is Super Admin only.
export const testimonialRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [{ path: ROUTES.TESTIMONIALS, element: <TestimonialManagementPage /> }],
  },
];
