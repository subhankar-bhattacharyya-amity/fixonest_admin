// Central place for application-wide settings.
export const appConfig = {
  name: "Fixonest",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "",
  authTokenKey: "token",
  authUserKey: "user",
  // Which backend role the stored session belongs to (super_admin | admin |
  // provider) - decides which role's /me and /logout endpoints to call,
  // since this one panel is shared by all three roles.
  authRoleKey: "role",
  loginPath: "/login",
  // Must match fixonest_backend/app/config/index.js's panels.super_admin /
  // panels.admin / panels.provider exactly - the backend rejects a login
  // whose declared panel doesn't match the role.
  panel: "fixonest_admin",
};
