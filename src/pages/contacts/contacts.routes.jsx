import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const ContactPage = lazy(() => import("./ContactPage.jsx"));

// "Contact Management" (layouts/sidebar/sidebar.data.js) for the Super Admin,
// Admins and providers. One page, mounted under each role's own dashboard
// path; each path only admits its own role, so an Admin can't open the Super
// Admin URL. A provider's page only lists messages sent to them.
export const contactRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [{ path: ROUTES.SUPER_ADMIN_CONTACTS, element: <ContactPage /> }],
  },
  {
    element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
    children: [{ path: ROUTES.ADMIN_CONTACTS, element: <ContactPage /> }],
  },
  {
    element: <RoleGuard allowedRoles={[ROLES.PROVIDER]} />,
    children: [{ path: ROUTES.PROVIDER_CONTACTS, element: <ContactPage /> }],
  },
];
