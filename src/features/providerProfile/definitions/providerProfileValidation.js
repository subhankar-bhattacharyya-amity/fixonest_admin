// Mirrors fixonest_backend's updateMyProviderDetailsSchema
// (app/modules/providers/validator/providers.validator.js). The backend
// accepts partial updates; this form always sends every field, and each one
// is required so a provider's public profile is never half empty. Number
// inputs use valueAsNumber, so an empty box arrives as NaN and fails with the
// "required" message.
import { z } from "zod";
import {
  PROVIDER_LANGUAGES,
  PROVIDER_BIO_MAX,
  PROVIDER_WHY_BOOK_MAX,
  PROVIDER_WHY_BOOK_ITEM_MAX,
} from "./providerProfile.js";

export const providerProfileValidationSchema = z.object({
  languages: z.array(z.enum(PROVIDER_LANGUAGES)).min(1, "Pick at least one language"),
  expertise_category_ids: z.array(z.string()).min(1, "Pick at least one service category"),
  years_experience: z
    .number({ error: "Years of experience is required" })
    .int("Use a whole number of years")
    .min(0, "Can't be negative")
    .max(60, "At most 60 years"),
  per_hours_price: z
    .number({ error: "Hourly price is required" })
    .min(1, "Price must be at least ₹1")
    .max(100000, "Price must be at most ₹1,00,000"),
  bio: z
    .string()
    .trim()
    .min(1, "Bio is required")
    .min(20, "Write at least 20 characters")
    .max(PROVIDER_BIO_MAX, `Bio must be at most ${PROVIDER_BIO_MAX} characters`),
  why_book: z
    .array(
      z.object({
        value: z
          .string()
          .trim()
          .min(3, "Write at least 3 characters")
          .max(PROVIDER_WHY_BOOK_ITEM_MAX, `At most ${PROVIDER_WHY_BOOK_ITEM_MAX} characters`),
      }),
    )
    .min(1, "Add at least one point")
    .max(PROVIDER_WHY_BOOK_MAX, `At most ${PROVIDER_WHY_BOOK_MAX} points`),
});
