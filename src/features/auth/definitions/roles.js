// Every role the auth feature knows about. Values mirror the backend's
// canonical Role.name strings (fixonest_backend/app/config/index.js's `roles`
// map). This one panel is shared by SUPER_ADMIN, ADMIN and PROVIDER -
// customers log in on fixonest_frontend.
export const ROLES = {
  PROVIDER: "provider",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

// Each role has its own auth endpoints under its own base path
// (fixonest_backend/app/config/index.js's roleBasePaths).
export const AUTH_BASE_PATHS = {
  [ROLES.SUPER_ADMIN]: "/super-admin/api/v1/auth",
  [ROLES.ADMIN]: "/admin/api/v1/auth",
  [ROLES.PROVIDER]: "/provider/api/v1/auth",
};

// The login screen has no role picker, so authSlice.js's loginUser tries each
// role's login endpoint in this order - the first that accepts the
// credentials is the user's role.
export const LOGIN_ROLE_ORDER = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PROVIDER];
