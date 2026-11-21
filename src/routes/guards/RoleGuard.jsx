import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/index.js";
import { getDashboardPath } from "../constants.js";

// Nested inside AuthGuard (see routes/config/private.routes.jsx), so a user
// always exists here. One panel serves Super Admin, Admin and Provider -
// this keeps each role on the pages meant for it by sending anyone else back
// to their own dashboard. The backend still enforces every role check on its
// side; this only decides what the UI shows.
export default function RoleGuard({ allowedRoles }) {
  const { role } = useAuth();
  return allowedRoles.includes(role) ? <Outlet /> : <Navigate to={getDashboardPath(role)} replace />;
}
