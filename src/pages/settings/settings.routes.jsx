import { lazy } from "react";
import { ROUTES } from "@/routes/constants.js";

const SettingsPage = lazy(() => import("./SettingsPage.jsx"));

// Shared by every role - no RoleGuard.
export const settingsRoutes = [{ path: ROUTES.SETTINGS, element: <SettingsPage /> }];
