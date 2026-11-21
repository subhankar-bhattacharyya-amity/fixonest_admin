// Mirrors fixonest_backend/app/modules/vertical_admin/validator/
// vertical_admin.validator.js (createAdminSchema / updateAdminSchema field
// rules). The edit form is always pre-filled, so every field stays required;
// only the changed ones are actually sent on update.
import { z } from "zod";
import { phoneSchema } from "@/utils/phone.js";

export const verticalAdminValidationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name must be at most 120 characters"),
  email: z.string().trim().toLowerCase().min(1, "Email is required").email("Enter a valid email address"),
  phone: phoneSchema,
  vertical_id: z.string().min(1, "Choose the vertical this admin will manage"),
});

// Creating also sets the admin's sign-in password (same strength floor as the
// backend's createAdminSchema). confirmPassword only exists client-side to
// catch typos - it's stripped before the request is sent.
export const createVerticalAdminValidationSchema = verticalAdminValidationSchema
  .extend({
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
