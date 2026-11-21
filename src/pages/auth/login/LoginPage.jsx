import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  useAuth,
  loginUser,
  loginValidationSchema,
} from "@/features/auth/index.js";
import { ROUTES, getDashboardPath } from "@/routes/constants.js";
import { BrandLogo } from "@/components/common/brandLogo/index.js";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { user, role } = useAuth();
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginValidationSchema),
    defaultValues: { email: "", password: "" },
  });

  // AuthGuard sends a direct visit to a protected page here with its
  // location as `from` - return there after login, otherwise go to the
  // role's own dashboard (RoleGuard corrects a `from` meant for another role).
  const redirectTo = location.state?.from?.pathname ?? getDashboardPath(role);

  if (user) return <Navigate to={redirectTo} replace />;

  const onSubmit = async (values) => {
    try {
      const result = await dispatch(loginUser(values)).unwrap();
      toast.success(result.message || "Login successful!");
    } catch {
      // Already surfaced by lib/httpClient.js's response interceptor (or by
      // loginUser itself for an earlier role's attempt).
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8"
      style={{
        backgroundImage:
          'url("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80")',
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-teal-900/70 to-slate-900/90 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full max-w-md p-6 sm:p-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size="lg" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">
            Welcome to Fixonest 👋
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Please sign-in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              placeholder="Enter your email address"
              autoComplete="email"
              className="input-field bg-white/50"
              aria-invalid={Boolean(errors.email)}
              required
              {...register("email")}
            />
            {errors.email && (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1 relative">
            <label className="text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="input-field bg-white/50 pr-10"
                aria-invalid={Boolean(errors.password)}
                required
                {...register("password")}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-teal-600 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p role="alert" className="text-xs font-medium text-rose-500">
                {errors.password.message}
              </p>
            )}
            <div className="flex justify-end mt-2">
              {/* Carries whatever email is already typed, so the reset page can prefill it. */}
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(ROUTES.FORGOT_PASSWORD, {
                    state: { email: getValues("email")?.trim() },
                  });
                }}
                className="text-xs font-medium text-teal-600 hover:text-teal-500"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary flex justify-center items-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
