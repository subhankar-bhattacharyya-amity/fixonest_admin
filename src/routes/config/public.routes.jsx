import { Navigate } from "react-router-dom";
import { authRoutes } from "@/pages/auth/auth.routes.jsx";
import { ROUTES } from "../constants.js";

// authRoutes owns its own entries. The catch-all stays here directly and
// must remain the last entry - any unknown URL goes to /login, which sends a
// logged-in user straight on to their own dashboard (see LoginPage.jsx).
export const publicRoutes = [...authRoutes, { path: "*", element: <Navigate to={ROUTES.LOGIN} replace /> }];
