import { lazy } from "react";
import { ROLES } from "@/features/auth/index.js";
import { ROUTES } from "@/routes/constants.js";
import RoleGuard from "@/routes/guards/RoleGuard.jsx";

const BlogManagementPage = lazy(() => import("./BlogManagementPage.jsx"));
const BlogEditorPage = lazy(() => import("./BlogEditorPage.jsx"));

// "Blog Management" (layouts/sidebar/sidebar.data.js) for both management
// roles: the listing, plus one editor page that writes a new blog (/new) or
// edits an existing one (/:blogId/edit). Mounted under each role's own
// dashboard path; each path only admits its own role, so an Admin can't open
// the Super Admin URLs. Both roles manage every blog.
export const blogRoutes = [
  {
    element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
    children: [
      { path: ROUTES.SUPER_ADMIN_BLOGS, element: <BlogManagementPage /> },
      { path: ROUTES.SUPER_ADMIN_BLOG_CREATE, element: <BlogEditorPage /> },
      { path: ROUTES.SUPER_ADMIN_BLOG_EDIT, element: <BlogEditorPage /> },
    ],
  },
  {
    element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
    children: [
      { path: ROUTES.ADMIN_BLOGS, element: <BlogManagementPage /> },
      { path: ROUTES.ADMIN_BLOG_CREATE, element: <BlogEditorPage /> },
      { path: ROUTES.ADMIN_BLOG_EDIT, element: <BlogEditorPage /> },
    ],
  },
];
