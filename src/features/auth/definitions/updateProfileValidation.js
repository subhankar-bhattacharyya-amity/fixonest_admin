// Same schema as fixonest_frontend's updateProfileValidation.js. Mirrors
// fixonest_backend/app/modules/auth/validator/auth.validator.js's
// updateProfileSchema field rules. The edit form always shows both fields
// pre-filled with the current profile values, so both are required here even
// though the backend accepts a partial body.
import { z } from "zod";

export const updateProfileValidationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name must be at most 120 characters"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^\+?[1-9]\d{6,14}$/, "Enter a valid phone number (7-15 digits, optional leading +)"),
});
