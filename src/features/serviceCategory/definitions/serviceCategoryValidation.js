// Mirrors fixonest_backend/app/modules/service_category/validator/service_category.validator.js
// (createServiceCategorySchema / updateServiceCategorySchema field rules). The
// edit form is always pre-filled, so every field stays required; only the
// changed ones are actually sent. The icon is a file handled outside the form.
// Status isn't part of the form: a new category is created Active by the
// backend, and it's changed from the listing afterwards.
import { z } from "zod";
import { SERVICE_CATEGORY_NAME_MAX, SERVICE_CATEGORY_DESCRIPTION_MAX } from "./serviceCategories.js";

const baseFields = {
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .min(2, "Name must be at least 2 characters")
    .max(SERVICE_CATEGORY_NAME_MAX, `Name must be at most ${SERVICE_CATEGORY_NAME_MAX} characters`),
  description: z
    .string()
    .trim()
    .max(SERVICE_CATEGORY_DESCRIPTION_MAX, `Description must be at most ${SERVICE_CATEGORY_DESCRIPTION_MAX} characters`),
};

// An Admin: the backend always files the category under the Admin's own vertical.
export const serviceCategoryValidationSchema = z.object(baseFields);

// The Super Admin also chooses which vertical the category belongs to.
export const superAdminServiceCategoryValidationSchema = z.object({
  ...baseFields,
  vertical_id: z.string().min(1, "Choose the vertical this category belongs to"),
});
