import { ROLES } from "@/features/auth/index.js";

// Route strings live in one place to prevent repeated hard-coded URLs.
export const ROUTES = {
  ROOT: "/",
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  SUPER_ADMIN_DASHBOARD: "/dashboard/super-admin",
  ADMIN_DASHBOARD: "/dashboard/admin",
  PROVIDER_DASHBOARD: "/dashboard/provider",
  LEGACY_TECHNICIAN_DASHBOARD: "/dashboard/technician",
  SETTINGS: "/dashboard/:role/settings",
  PROFILE: "/dashboard/:role/profile",
  VERTICALS: "/dashboard/super-admin/verticals",
  VERTICAL_ADMINS: "/dashboard/super-admin/users/admins",
  SUPER_ADMIN_PROVIDERS: "/dashboard/super-admin/users/providers",
  ADMIN_PROVIDERS: "/dashboard/admin/users/providers",
  CUSTOMERS: "/dashboard/super-admin/users/customers",
  SUPER_ADMIN_SERVICE_CATEGORIES: "/dashboard/super-admin/categories/services",
  ADMIN_SERVICE_CATEGORIES: "/dashboard/admin/categories/services",
  BLOG_CATEGORIES: "/dashboard/super-admin/categories/blogs",
  SUPER_ADMIN_BLOGS: "/dashboard/super-admin/blogs",
  SUPER_ADMIN_BLOG_CREATE: "/dashboard/super-admin/blogs/new",
  SUPER_ADMIN_BLOG_EDIT: "/dashboard/super-admin/blogs/:blogId/edit",
  ADMIN_BLOGS: "/dashboard/admin/blogs",
  ADMIN_BLOG_CREATE: "/dashboard/admin/blogs/new",
  ADMIN_BLOG_EDIT: "/dashboard/admin/blogs/:blogId/edit",
  SUPER_ADMIN_SERVICES: "/dashboard/super-admin/services",
  SUPER_ADMIN_SERVICE_CREATE: "/dashboard/super-admin/services/new",
  SUPER_ADMIN_SERVICE_EDIT: "/dashboard/super-admin/services/:serviceId/edit",
  ADMIN_SERVICES: "/dashboard/admin/services",
  ADMIN_SERVICE_CREATE: "/dashboard/admin/services/new",
  ADMIN_SERVICE_EDIT: "/dashboard/admin/services/:serviceId/edit",
  SUPER_ADMIN_SERVICE_REVIEWS: "/dashboard/super-admin/service-reviews",
  ADMIN_SERVICE_REVIEWS: "/dashboard/admin/service-reviews",
  TESTIMONIALS: "/dashboard/super-admin/testimonials",
  FAQS: "/dashboard/super-admin/faqs",
  SUPER_ADMIN_PROVIDER_ASSIGNMENTS: "/dashboard/super-admin/assignments/providers",
  ADMIN_PROVIDER_ASSIGNMENTS: "/dashboard/admin/assignments/providers",
  TEAM_MEMBERS: "/dashboard/super-admin/team",
  SUPER_ADMIN_CONTACTS: "/dashboard/super-admin/contacts",
  ADMIN_CONTACTS: "/dashboard/admin/contacts",
  PROVIDER_CONTACTS: "/dashboard/provider/contacts",
  PROVIDER_BOOKINGS: "/dashboard/provider/bookings",
  PROVIDER_BOOKING_DETAILS: "/dashboard/provider/bookings/:bookingId",
  PROVIDER_REPORTS: "/dashboard/provider/reports",
  PROVIDER_BOOKING_CALENDAR: "/dashboard/provider/booking-calendar",
  SUPER_ADMIN_BOOKINGS: "/dashboard/super-admin/bookings",
  SUPER_ADMIN_BOOKING_DETAILS: "/dashboard/super-admin/bookings/:bookingId",
  ADMIN_BOOKINGS: "/dashboard/admin/bookings",
  ADMIN_BOOKING_DETAILS: "/dashboard/admin/bookings/:bookingId",
  // "My Tasks" was renamed "My Bookings" - old links redirect.
  LEGACY_PROVIDER_TASKS: "/dashboard/provider/tasks",
};

// Each role's URL segment under /dashboard. The Topbar's role label is read
// from this segment ("provider" -> "Provider").
const ROLE_DASHBOARD_PATHS = {
  [ROLES.SUPER_ADMIN]: ROUTES.SUPER_ADMIN_DASHBOARD,
  [ROLES.ADMIN]: ROUTES.ADMIN_DASHBOARD,
  [ROLES.PROVIDER]: ROUTES.PROVIDER_DASHBOARD,
};

// A logged-in user's home - every role-scoped link (sidebar items, the
// post-login redirect, RoleGuard's fallback) is built from this.
export const getDashboardPath = (role) => ROLE_DASHBOARD_PATHS[role];

// Pairs with the ROUTES.SETTINGS ":role" pattern above.
export const getSettingsPath = (role) => `${getDashboardPath(role)}/settings`;

// Pairs with the ROUTES.PROFILE ":role" pattern above.
export const getProfilePath = (role) => `${getDashboardPath(role)}/profile`;

// Blog Management's pages, under the viewer's own dashboard path. They pair
// with the ROUTES.*_BLOGS, *_BLOG_CREATE and *_BLOG_EDIT patterns above.
export const getBlogsPath = (role) => `${getDashboardPath(role)}/blogs`;
export const getBlogCreatePath = (role) => `${getBlogsPath(role)}/new`;
export const getBlogEditPath = (role, blogId) => `${getBlogsPath(role)}/${blogId}/edit`;

// Service Management's pages, under the viewer's own dashboard path. They pair
// with the ROUTES.*_SERVICES, *_SERVICE_CREATE and *_SERVICE_EDIT patterns above.
export const getServicesPath = (role) => `${getDashboardPath(role)}/services`;
export const getServiceCreatePath = (role) => `${getServicesPath(role)}/new`;
export const getServiceEditPath = (role, serviceId) => `${getServicesPath(role)}/${serviceId}/edit`;

// Reviews & Ratings Management, under the viewer's own dashboard path. Add
// ?service=<id> to open it filtered to one service.
export const getServiceReviewsPath = (role) => `${getDashboardPath(role)}/service-reviews`;

// A provider's booking details page - pairs with ROUTES.PROVIDER_BOOKING_DETAILS.
export const getProviderBookingDetailsPath = (bookingId) => `${ROUTES.PROVIDER_BOOKINGS}/${bookingId}`;

// Booking Management (Super Admin / Admin), under the viewer's own dashboard
// path. Pairs with ROUTES.*_BOOKINGS and *_BOOKING_DETAILS.
export const getBookingManagementPath = (role) => `${getDashboardPath(role)}/bookings`;
export const getBookingManagementDetailsPath = (role, bookingId) => `${getBookingManagementPath(role)}/${bookingId}`;
