import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const FaqManagementPage = lazy(() => import("./FaqManagementPage.jsx"));

// "FAQ Management" (layouts/sidebar/sidebar.data.js). Super Admin only - the
// Super Admin writes the FAQs shown on each page of the customer site.
export const faqRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [{ path: ROUTES.FAQS, element: <FaqManagementPage /> }],
  },
];
