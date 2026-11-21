import { lazy } from "react";
import { ROUTES } from "@/routes/constants.js";

const LoginPage = lazy(() => import("./login/LoginPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./forgot-password/ForgotPasswordPage.jsx"));

export const authRoutes = [
  { path: ROUTES.LOGIN, element: <LoginPage /> },
  { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
];
