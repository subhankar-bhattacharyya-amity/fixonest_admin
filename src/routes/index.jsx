import { Navigate, useRoutes } from "react-router-dom";
import { privateRoutes } from "./config/private.routes.jsx";
import { publicRoutes } from "./config/public.routes.jsx";
import { ROUTES } from "./constants.js";

export default function AppRoutes() {
  return useRoutes([
    { path: ROUTES.ROOT, element: <Navigate to={ROUTES.LOGIN} replace /> },
    privateRoutes,
    ...publicRoutes,
  ]);
}
