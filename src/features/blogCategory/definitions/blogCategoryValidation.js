// Mirrors fixonest_backend/app/modules/blog_category/validator/blog_category.validator.js
// (createBlogCategorySchema / updateBlogCategorySchema field rules). The edit
// form is always pre-filled, so every field stays required; only the changed
// ones are actually sent. Status isn't part of the form: a new category is
// created Active by the backend, and it's changed from the listing afterwards.
import { z } from "zod";
import {
  BLOG_CATEGORY_NAME_MIN,
  BLOG_CATEGORY_NAME_MAX,
  BLOG_CATEGORY_SLUG_MAX,
  BLOG_CATEGORY_SLUG_PATTERN,
  BLOG_CATEGORY_DESCRIPTION_MAX,
} from "./blogCategories.js";

export const blogCategoryValidationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .min(BLOG_CATEGORY_NAME_MIN, `Name must be at least ${BLOG_CATEGORY_NAME_MIN} characters`)
    .max(BLOG_CATEGORY_NAME_MAX, `Name must be at most ${BLOG_CATEGORY_NAME_MAX} characters`),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required - use letters or numbers")
    .max(BLOG_CATEGORY_SLUG_MAX, `Slug must be at most ${BLOG_CATEGORY_SLUG_MAX} characters`)
    .regex(BLOG_CATEGORY_SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens only"),
  description: z
    .string()
    .trim()
    .max(BLOG_CATEGORY_DESCRIPTION_MAX, `Description must be at most ${BLOG_CATEGORY_DESCRIPTION_MAX} characters`),
});
