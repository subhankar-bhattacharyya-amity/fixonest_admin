// Mirrors fixonest_backend/app/modules/blog/validator/blog.validator.js
// (createBlogSchema / updateBlogSchema field rules). The edit form is always
// pre-filled, so every field stays required; only the changed ones are
// actually sent. The cover and gallery images are files, checked by the
// editor page itself as they're picked.
import { z } from "zod";
import {
  BLOG_TITLE_MIN,
  BLOG_TITLE_MAX,
  BLOG_SLUG_MAX,
  BLOG_SLUG_PATTERN,
  BLOG_EXCERPT_MAX,
  BLOG_AUTHOR_MIN,
  BLOG_AUTHOR_MAX,
  BLOG_TAG_MAX,
  BLOG_TAGS_LIMIT,
  BLOG_CONTENT_MIN_TEXT,
  blogHtmlToText,
} from "./blogs.js";

export const blogValidationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .min(BLOG_TITLE_MIN, `Title must be at least ${BLOG_TITLE_MIN} characters`)
    .max(BLOG_TITLE_MAX, `Title must be at most ${BLOG_TITLE_MAX} characters`),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required - use letters or numbers")
    .max(BLOG_SLUG_MAX, `Slug must be at most ${BLOG_SLUG_MAX} characters`)
    .regex(BLOG_SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens only"),
  blogCategoryId: z.string().min(1, "Choose a category"),
  writtenBy: z
    .string()
    .trim()
    .min(1, "Author name is required")
    .min(BLOG_AUTHOR_MIN, `Author name must be at least ${BLOG_AUTHOR_MIN} characters`)
    .max(BLOG_AUTHOR_MAX, `Author name must be at most ${BLOG_AUTHOR_MAX} characters`),
  excerpt: z.string().trim().max(BLOG_EXCERPT_MAX, `Summary must be at most ${BLOG_EXCERPT_MAX} characters`),
  // The editor's HTML. An "empty" editor still holds "<p></p>", so the check
  // is on the text a reader would actually see.
  content: z
    .string()
    .refine((html) => blogHtmlToText(html).length > 0, "Write the blog's content")
    .refine(
      (html) => blogHtmlToText(html).length >= BLOG_CONTENT_MIN_TEXT,
      `Content must be at least ${BLOG_CONTENT_MIN_TEXT} characters`,
    ),
  tags: z
    .array(z.string().trim().min(1).max(BLOG_TAG_MAX))
    .max(BLOG_TAGS_LIMIT, `Add at most ${BLOG_TAGS_LIMIT} tags`),
  isPublished: z.boolean(),
  isPopular: z.boolean(),
  isTrendy: z.boolean(),
});
