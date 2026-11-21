// Mirrors fixonest_backend/app/modules/service/validator/service.validator.js
// (createServiceSchema / updateServiceSchema field rules). The edit form is
// always pre-filled, so every field is checked; only the changed ones are
// actually sent. Images are files, checked as they're picked.
import { z } from "zod";
import {
  SERVICE_NAME_MAX,
  SERVICE_DESCRIPTION_MAX,
  SERVICE_OVERVIEW_MAX,
  SERVICE_DURATION_LABEL_MAX,
  SERVICE_LIST_ITEM_MAX,
  SERVICE_LIST_LIMIT,
  SERVICE_STATUS,
} from "./services.js";

const listRule = (label) =>
  z
    .array(z.string().trim().min(1).max(SERVICE_LIST_ITEM_MAX, `Each ${label} must be at most ${SERVICE_LIST_ITEM_MAX} characters`))
    .max(SERVICE_LIST_LIMIT, `Add at most ${SERVICE_LIST_LIMIT} ${label}s`);

// Number inputs hand over NaN when empty - reported as "required".
const amount = (requiredMessage) =>
  z
    .number({ error: requiredMessage })
    .refine((value) => !Number.isNaN(value), requiredMessage)
    .min(0, "Cannot be negative");

export const serviceValidationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Service name is required")
      .max(SERVICE_NAME_MAX, `Name must be at most ${SERVICE_NAME_MAX} characters`),
    categoryId: z.string().min(1, "Choose a category"),
    description: z
      .string()
      .trim()
      .min(1, "Add a one-line description for the service card")
      .max(SERVICE_DESCRIPTION_MAX, `Description must be at most ${SERVICE_DESCRIPTION_MAX} characters`),
    status: z.enum([SERVICE_STATUS.ACTIVE, SERVICE_STATUS.INACTIVE]),
    isFeatured: z.boolean(),

    price: amount("Enter the price"),
    discountPrice: amount("Enter the discounted price, or 0"),
    durationInMinutes: amount("Enter the duration in minutes, or 0").int("Use whole minutes"),
    durationLabel: z
      .string()
      .trim()
      .max(SERVICE_DURATION_LABEL_MAX, `Keep it under ${SERVICE_DURATION_LABEL_MAX} characters`),

    overview: z.string().trim().max(SERVICE_OVERVIEW_MAX, `Overview must be at most ${SERVICE_OVERVIEW_MAX} characters`),
    whatYouGet: listRule("item"),
    packageBenefits: listRule("benefit"),
    skills: listRule("skill"),

  })
  .refine((values) => !(values.discountPrice > 0) || values.discountPrice <= values.price, {
    path: ["discountPrice"],
    message: "The discounted price can't be higher than the price",
  });
