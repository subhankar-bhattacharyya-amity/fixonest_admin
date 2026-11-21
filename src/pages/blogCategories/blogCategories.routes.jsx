import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const BlogCategoryManagementPage = lazy(() => import("./BlogCategoryManagementPage.jsx"));

// "Category Management > Blog Category" (layouts/sidebar/sidebar.data.js).
// Super Admin only - the backend routes blog categories under
// /super-admin/api alone, so an Admin has no blog category endpoints to call.
export const blogCategoryRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [{ path: ROUTES.BLOG_CATEGORIES, element: <BlogCategoryManagementPage /> }],
  },
];
