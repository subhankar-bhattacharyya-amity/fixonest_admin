import { lazy } from "react";
import { ROUTES } from "@/routes/constants.js";

const ProfilePage = lazy(() => import("./ProfilePage.jsx"));

// Shared by every role - no RoleGuard.
export const profileRoutes = [{ path: ROUTES.PROFILE, element: <ProfilePage /> }];
