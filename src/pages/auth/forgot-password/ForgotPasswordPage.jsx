import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Clock,
  Inbox,
  KeyRound,
  Loader2,
  LockKeyhole,
  MailCheck,
  PencilLine,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import {
  useAuth,
  ROLES,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetForgottenPassword,
  RESET_OTP_LENGTH,
  RESET_OTP_RESEND_COOLDOWN_SECONDS,
  forgotPasswordEmailSchema,
  resetOtpSchema,
  resetPasswordSchema,
} from "@/features/auth/index.js";
import { ROUTES, getDashboardPath } from "@/routes/constants.js";
import { BrandLogo } from "@/components/common/brandLogo/index.js";
import { FormField, PasswordField } from "@/components/common/form/index.js";
import { PASSWORD_STRENGTH_LEVELS, getPasswordStrength } from "@/utils/password.js";
import OtpInput from "../components/OtpInput.jsx";

const SUCCESS_REDIRECT_SECONDS = 5;

// Same teal gradient button as the Login page.
const PRIMARY_BUTTON =
  "w-full btn-primary flex justify-center items-center gap-2 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/30 disabled:opacity-70 disabled:cursor-not-allowed";

const LINK_BUTTON =
  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-teal-600 transition-colors hover:bg-teal-50 hover:text-teal-700 disabled:opacity-60";

const STEPS = [
  { id: "email", label: "Email" },
  { id: "verify", label: "Verify" },
  { id: "reset", label: "New password" },
];

const PHASE_COPY = {
  email: {
    title: "Forgot your password?",
    subtitle: `Enter your account email and we'll send you a ${RESET_OTP_LENGTH}-digit code.`,
  },
  verify: {
    title: "Check your inbox",
    subtitle: `Enter the ${RESET_OTP_LENGTH}-digit code we emailed you.`,
  },
  reset: {
    title: "Set a new password",
    subtitle: "Choose a strong password you haven't used before.",
  },
  success: {
    title: "Password updated",
    subtitle: "You can now sign in with your new password.",
  },
};

const PHASE_ICONS = { email: KeyRound, verify: MailCheck, reset: LockKeyhole };

const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Admin",
  [ROLES.PROVIDER]: "Provider",
};

const toMs = (value) => (value ? new Date(value).getTime() : null);

// Only ever called from event handlers / async callbacks, never during render.
const currentTime = () => Date.now();

function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// Re-renders once a second while `active`, driving every countdown on the page.
function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function StepIndicator({ phase }) {
  const activeIndex = phase === "success" ? STEPS.length : STEPS.findIndex((step) => step.id === phase);
  return (
    <ol className="mb-6 flex items-center" aria-label="Password reset progress">
      {STEPS.map((step, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <li key={step.id} className={`flex items-center ${index < STEPS.length - 1 ? "flex-1" : ""}`}>
            <div className="flex flex-col items-center gap-1">
              <span
                aria-current={isActive ? "step" : undefined}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                  isDone
                    ? "bg-linear-to-br from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/30"
                    : isActive
                      ? "bg-white text-teal-600 ring-2 ring-teal-500"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {isDone ? <Check size={15} strokeWidth={3} /> : index + 1}
              </span>
              <span
                className={`whitespace-nowrap text-[11px] font-medium ${
                  isActive || isDone ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className="mx-2 mb-5 h-0.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-linear-to-r from-teal-400 to-teal-600 transition-[width] duration-500 ease-out"
                  style={{ width: isDone ? "100%" : "0%" }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function PhaseIcon({ phase }) {
  const Icon = PHASE_ICONS[phase];
  return (
    <div className="relative mx-auto mb-5 h-16 w-16">
      <span aria-hidden="true" className="absolute inset-0 animate-pulse rounded-2xl bg-teal-400/30 blur-xl" />
      <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30 ring-4 ring-white/80">
        <Icon size={28} strokeWidth={1.75} />
      </span>
      <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow ring-2 ring-white">
        <ShieldCheck size={13} />
      </span>
    </div>
  );
}

// Small ring that empties as the resend cooldown runs out.
function CountdownRing({ progress }) {
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4 -rotate-90" aria-hidden="true">
      <circle cx="9" cy="9" r={radius} fill="none" strokeWidth="2" className="stroke-slate-200" />
      <circle
        cx="9"
        cy="9"
        r={radius}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-teal-500 transition-[stroke-dashoffset] duration-1000 ease-linear"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
      />
    </svg>
  );
}

// Same four-segment meter as the Provider / Vertical Admin forms, plus the
// two rules the backend actually enforces as a checklist.
function StrengthMeter({ password }) {
  const score = getPasswordStrength(password);
  const level = PASSWORD_STRENGTH_LEVELS[score];
  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "A letter and a number", ok: /[A-Za-z]/.test(password) && /\d/.test(password) },
  ];
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex items-center gap-2" aria-live="polite">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                password && segment <= Math.max(score, 1) ? level.bar : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <span className={`whitespace-nowrap text-[11px] font-semibold ${password ? level.text : "text-slate-400"}`}>
          {password ? level.label : "Strength"}
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-xs transition-colors ${rule.ok ? "text-emerald-600" : "text-slate-400"}`}
          >
            <span
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors ${
                rule.ok ? "bg-emerald-500 text-white" : "bg-slate-200"
              }`}
            >
              {rule.ok && <Check size={9} strokeWidth={3.5} />}
            </span>
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuccessMark() {
  return (
    <div className="relative mx-auto mb-6 h-20 w-20">
      <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
      <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-teal-500 text-white shadow-xl shadow-emerald-500/30 ring-8 ring-emerald-50">
        <Check size={40} strokeWidth={3} />
      </span>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const { user, role: loggedInRole } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState("email");
  // { email, role, issuedAt, expiresAt, resendAvailableAt } for the current code.
  const [session, setSession] = useState(null);
  // { resetToken, expiresAt } once the code is verified. Component state only.
  const [reset, setReset] = useState(null);
  const [otpStatus, setOtpStatus] = useState("idle");
  const [inlineError, setInlineError] = useState(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [completedAt, setCompletedAt] = useState(null);
  const email = session?.email ?? null;

  const emailForm = useForm({
    resolver: zodResolver(forgotPasswordEmailSchema),
    defaultValues: { email: location.state?.email ?? "" },
  });
  const otpForm = useForm({
    resolver: zodResolver(resetOtpSchema),
    defaultValues: { otp: "" },
  });
  const passwordForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });
  const isVerifying = otpForm.formState.isSubmitting;
  const isResetting = passwordForm.formState.isSubmitting;
  const newPassword = useWatch({ control: passwordForm.control, name: "newPassword" }) ?? "";

  const now = useNow(phase !== "email");
  const issuedAt = toMs(session?.issuedAt);
  const expiresAt = toMs(session?.expiresAt);
  const resendAt = toMs(session?.resendAvailableAt);
  const secondsToExpiry = expiresAt ? (expiresAt - now) / 1000 : null;
  const isExpired = secondsToExpiry !== null && secondsToExpiry <= 0;
  const isExpiringSoon = secondsToExpiry !== null && secondsToExpiry > 0 && secondsToExpiry <= 60;
  const expiryProgress =
    expiresAt && issuedAt && expiresAt > issuedAt
      ? Math.min(1, Math.max(0, (expiresAt - now) / (expiresAt - issuedAt)))
      : null;
  const secondsToResend = resendAt ? Math.max(0, (resendAt - now) / 1000) : 0;
  const resendProgress = Math.min(1, secondsToResend / RESET_OTP_RESEND_COOLDOWN_SECONDS);
  const resetSecondsLeft = reset?.expiresAt ? (toMs(reset.expiresAt) - now) / 1000 : null;

  const goToLogin = () => navigate(ROUTES.LOGIN, { replace: true });

  const resetOtp = () => {
    otpForm.setValue("otp", "");
    setOtpStatus("idle");
    setInlineError(null);
  };

  const sendCode = async (targetEmail = email) => {
    if (!targetEmail || isSending) return;
    setIsSending(true);
    try {
      const result = await dispatch(requestPasswordReset({ email: targetEmail })).unwrap();
      const sentAt = currentTime();
      setSession({
        email: targetEmail,
        role: result.role,
        issuedAt: sentAt,
        expiresAt: toMs(result.data?.expiresAt),
        resendAvailableAt: toMs(result.data?.resendAvailableAt) ?? sentAt + RESET_OTP_RESEND_COOLDOWN_SECONDS * 1000,
      });
      setReset(null);
      resetOtp();
      setPhase("verify");
      toast.success(result.message);
    } catch {
      // Already toasted by httpClient's interceptor (or by the thunk itself).
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (phase !== "success") return undefined;
    const id = setTimeout(goToLogin, SUCCESS_REDIRECT_SECONDS * 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // The reset window ran out while the user was choosing a password.
  const resetExpiresAt = toMs(reset?.expiresAt);
  useEffect(() => {
    if (phase !== "reset" || !resetExpiresAt) return undefined;
    const id = setTimeout(() => {
      toast.error("Your reset session expired. Please request a new code.");
      setReset(null);
      setPhase("email");
    }, Math.max(0, resetExpiresAt - currentTime()));
    return () => clearTimeout(id);
  }, [phase, resetExpiresAt]);

  if (user) return <Navigate to={getDashboardPath(loggedInRole)} replace />;

  const onVerify = async ({ otp }) => {
    try {
      const result = await dispatch(verifyPasswordResetOtp({ role: session.role, email, otp })).unwrap();
      setOtpStatus("success");
      toast.success(result.message);
      // Let the boxes flash green for a beat before moving on.
      setTimeout(() => {
        setReset({ resetToken: result.data?.resetToken, expiresAt: result.data?.expiresAt });
        passwordForm.reset({ newPassword: "", confirmNewPassword: "" });
        setPhase("reset");
      }, 650);
    } catch (error) {
      setOtpStatus("error");
      setInlineError(error?.message || "That code didn't work. Please try again.");
      otpForm.setValue("otp", "");
      setShakeKey((key) => key + 1);
    }
  };

  const submitOtp = otpForm.handleSubmit(onVerify);

  const onResetSubmit = async ({ newPassword: password }) => {
    try {
      const result = await dispatch(
        resetForgottenPassword({ role: session.role, email, resetToken: reset?.resetToken, newPassword: password }),
      ).unwrap();
      toast.success(result.message);
      setReset(null);
      setCompletedAt(currentTime());
      setPhase("success");
    } catch {
      // Already toasted. If the reset token can no longer be used, the only
      // way forward is a fresh code.
      if (!reset?.expiresAt || toMs(reset.expiresAt) <= currentTime()) {
        setReset(null);
        setPhase("email");
      }
    }
  };

  const otpError = inlineError || otpForm.formState.errors.otp?.message;
  const redirectIn = completedAt
    ? Math.max(0, Math.ceil(SUCCESS_REDIRECT_SECONDS - (now - completedAt) / 1000))
    : SUCCESS_REDIRECT_SECONDS;
  const copy = PHASE_COPY[phase];

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
      {/* Same overlay as the Login page. */}
      <div className="absolute inset-0 bg-linear-to-br from-teal-900/70 to-slate-900/90 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full max-w-md p-6 sm:p-8 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo />
          <div>
            <p className="text-sm font-bold leading-tight text-gray-800">Fixonest</p>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>

        {phase !== "success" && <StepIndicator phase={phase} />}

        <div key={phase} className="animate-rise-in">
          {phase === "success" ? <SuccessMark /> : <PhaseIcon phase={phase} />}

          <div className="mb-6 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">{copy.title}</h2>
            <p className="text-sm text-gray-500 mt-2">{copy.subtitle}</p>
          </div>

          {phase === "email" && (
            <form className="space-y-5" onSubmit={emailForm.handleSubmit(({ email: value }) => sendCode(value))} noValidate>
              <FormField
                id="resetEmail"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email address"
                error={emailForm.formState.errors.email?.message}
                registration={emailForm.register("email")}
              />
              <button type="submit" disabled={isSending} className={`group ${PRIMARY_BUTTON}`}>
                {isSending ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Send reset code
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
              {session && !isExpired && (
                <button
                  type="button"
                  onClick={() => setPhase("verify")}
                  className="w-full text-center text-sm font-medium text-gray-500 transition-colors hover:text-teal-600"
                >
                  I already have a code
                </button>
              )}
              <div className="flex items-start gap-2.5 rounded-xl bg-teal-50 p-3 text-xs leading-relaxed text-teal-800">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                <span>Works for Super Admin, Admin and Provider accounts. The code is single-use and expires in a few minutes.</span>
              </div>
            </form>
          )}

          {phase === "verify" && (
            <>
              <div className="mb-6 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="break-all text-sm font-semibold text-gray-800">{email}</span>
                  <button
                    type="button"
                    onClick={() => {
                      emailForm.setValue("email", email ?? "");
                      setPhase("email");
                    }}
                    aria-label="Use a different email"
                    title="Use a different email"
                    className="rounded-md p-1 text-gray-400 transition-colors hover:bg-teal-50 hover:text-teal-600"
                  >
                    <PencilLine size={14} />
                  </button>
                </div>
                {session?.role && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700">
                    <ShieldCheck size={12} />
                    {ROLE_LABELS[session.role]} account
                  </span>
                )}
              </div>

              <form onSubmit={submitOtp} noValidate>
                <Controller
                  name="otp"
                  control={otpForm.control}
                  render={({ field }) => (
                    <OtpInput
                      length={RESET_OTP_LENGTH}
                      value={field.value}
                      onChange={(next) => {
                        field.onChange(next);
                        if (otpStatus === "error") {
                          setOtpStatus("idle");
                          setInlineError(null);
                        }
                        if (otpForm.formState.errors.otp) otpForm.clearErrors("otp");
                      }}
                      onComplete={() => {
                        if (!isVerifying && !isExpired && otpStatus !== "success") submitOtp();
                      }}
                      status={otpStatus}
                      shakeKey={shakeKey}
                      disabled={isVerifying || otpStatus === "success"}
                      autoFocus
                      ariaDescribedBy="reset-otp-status"
                    />
                  )}
                />

                <div id="reset-otp-status" aria-live="polite" className="mt-6 min-h-10 space-y-2">
                  {otpError ? (
                    <p role="alert" className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-rose-500">
                      <CircleAlert size={14} className="shrink-0" />
                      {otpError}
                    </p>
                  ) : isExpired ? (
                    <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-amber-600">
                      <CircleAlert size={14} className="shrink-0" />
                      This code has expired. Request a new one below.
                    </p>
                  ) : secondsToExpiry !== null ? (
                    <p className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                      <Clock size={14} className="shrink-0" />
                      Code expires in
                      <span className={`font-semibold tabular-nums ${isExpiringSoon ? "text-amber-600" : "text-gray-700"}`}>
                        {formatClock(secondsToExpiry)}
                      </span>
                    </p>
                  ) : null}

                  {expiryProgress !== null && !isExpired && (
                    <div className="mx-auto h-1 max-w-72 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full bg-linear-to-r transition-[width] duration-1000 ease-linear ${
                          isExpiringSoon ? "from-amber-400 to-orange-500" : "from-teal-400 to-teal-600"
                        }`}
                        style={{ width: `${expiryProgress * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || isExpired || otpStatus === "success"}
                  className={`mt-3 ${PRIMARY_BUTTON}`}
                >
                  {otpStatus === "success" ? (
                    <>
                      <Check size={18} /> Verified
                    </>
                  ) : isVerifying ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    "Verify code"
                  )}
                </button>
              </form>

              <div className="mt-5 flex flex-col items-center gap-1 border-t border-slate-200/80 pt-4 text-sm">
                <p className="text-gray-500">Didn't get the code?</p>
                {secondsToResend > 0 ? (
                  <p className="inline-flex items-center gap-2 font-medium text-gray-400">
                    <CountdownRing progress={resendProgress} />
                    Resend available in
                    <span className="font-semibold tabular-nums text-gray-600">{formatClock(secondsToResend)}</span>
                  </p>
                ) : (
                  <button type="button" onClick={() => sendCode()} disabled={isSending} className={`group ${LINK_BUTTON}`}>
                    <RotateCw
                      size={15}
                      className={`transition-transform duration-300 ${isSending ? "animate-spin" : "group-hover:-rotate-90"}`}
                    />
                    {isSending ? "Sending a new code…" : "Resend code"}
                  </button>
                )}
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-slate-100/80 p-3 text-xs leading-relaxed text-gray-500">
                <Inbox size={16} className="mt-0.5 shrink-0 text-teal-600" />
                <span>Can't find it? Check your spam folder. Too many wrong tries cancel the code.</span>
              </div>
            </>
          )}

          {phase === "reset" && (
            <form className="space-y-4" onSubmit={passwordForm.handleSubmit(onResetSubmit)} noValidate>
              {/* Lets password managers attach the new password to the right account. */}
              <input type="email" name="username" autoComplete="username" value={email ?? ""} readOnly hidden />
              <PasswordField
                id="newPassword"
                label="New password"
                autoComplete="new-password"
                error={passwordForm.formState.errors.newPassword?.message}
                registration={passwordForm.register("newPassword")}
              />
              <StrengthMeter password={newPassword} />
              <PasswordField
                id="confirmNewPassword"
                label="Confirm new password"
                autoComplete="new-password"
                error={passwordForm.formState.errors.confirmNewPassword?.message}
                registration={passwordForm.register("confirmNewPassword")}
              />
              <button type="submit" disabled={isResetting} className={`mt-2 ${PRIMARY_BUTTON}`}>
                {isResetting ? <Loader2 className="animate-spin" size={20} /> : "Reset password"}
              </button>
              {resetSecondsLeft !== null && resetSecondsLeft > 0 && (
                <p className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                  <Clock size={14} className="shrink-0" />
                  Finish within
                  <span className="font-semibold tabular-nums text-gray-700">{formatClock(resetSecondsLeft)}</span>
                </p>
              )}
            </form>
          )}

          {phase === "success" && (
            <div className="text-center">
              <p className="text-sm leading-relaxed text-gray-500">
                The password for <span className="break-all font-semibold text-gray-700">{email}</span> has been changed.
              </p>
              <button type="button" onClick={goToLogin} className={`group mt-6 ${PRIMARY_BUTTON}`}>
                Back to login
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </button>
              <p className="mt-3 text-xs text-gray-400">
                Redirecting in <span className="tabular-nums">{redirectIn}</span>s…
              </p>
            </div>
          )}
        </div>

        {phase !== "success" && (
          <div className="mt-6 text-center">
            <Link
              to={ROUTES.LOGIN}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-500"
            >
              <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
