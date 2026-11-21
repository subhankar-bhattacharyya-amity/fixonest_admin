// Schemas for the three forgot-password steps. They mirror
// fixonest_backend/app/modules/auth/validator/auth.validator.js's
// forgotPasswordSchema, verifyResetOtpSchema and resetPasswordSchema - the
// same rules fixonest_frontend's forgot-password page uses.
import { z } from "zod";

export const RESET_OTP_LENGTH = 4;

// Mirrors backend appConfig.security.otpResendCooldownSeconds. Only a
// fallback for when the backend hasn't told us resendAvailableAt.
export const RESET_OTP_RESEND_COOLDOWN_SECONDS = 60;

export const forgotPasswordEmailSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email is required").email("Enter a valid email address"),
});

export const resetOtpSchema = z.object({
  otp: z.string().regex(new RegExp(`^\\d{${RESET_OTP_LENGTH}}$`), `Enter the ${RESET_OTP_LENGTH}-digit code`),
});

// confirmNewPassword only exists client-side, to catch typos.
export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password must contain at least one letter and one number"),
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });
