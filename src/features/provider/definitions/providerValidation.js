// Mirrors fixonest_backend/app/modules/providers/validator/providers.validator.js
// (createProviderSchema / updateProviderSchema field rules). The edit form is
// always pre-filled, so every field stays required; only the changed ones are
// actually sent.
import { z } from "zod";
import { phoneSchema } from "@/utils/phone.js";

const baseFields = {
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name must be at most 120 characters"),
  email: z.string().trim().toLowerCase().min(1, "Email is required").email("Enter a valid email address"),
  phone: phoneSchema,
};

// Editing a provider as an Admin: details only.
export const providerValidationSchema = z.object(baseFields);

// Editing a provider as the Super Admin: details plus the rating and review
// count shown on the customer site (updateProviderRatingSchema on the
// backend). The inputs use valueAsNumber, so an empty box arrives as NaN and
// fails with the "required" message.
export const superAdminProviderValidationSchema = z.object({
  ...baseFields,
  ratings: z
    .number({ error: "Rating is required" })
    .min(0, "Rating can't be below 0")
    .max(5, "Rating can't be above 5")
    // Tolerance, since e.g. 4.7 * 10 is 47.00000000000001 in floating point.
    .refine((value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9, "Use at most one decimal place"),
  review_count: z
    .number({ error: "Review count is required" })
    .int("Review count must be a whole number")
    .min(0, "Review count can't be negative"),
});

// The Super Admin creating a provider: details and a sign-in
// password (same strength floor as the backend). confirmPassword only exists
// client-side to catch typos - it's stripped before the request is sent.
export const createProviderValidationSchema = z
  .object({
    ...baseFields,
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password must contain at least one letter and one number"),
    confirmPassword: z.string().min(1, "Please confirm the password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
