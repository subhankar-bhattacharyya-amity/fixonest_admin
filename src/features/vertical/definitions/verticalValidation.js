// Mirrors fixonest_backend/app/modules/vertical/validator/vertical.validator.js:
// name is a lowercase snake_case key (2-60 characters); display_name is at
// most 120 characters. The form asks for a display name (the backend would
// otherwise default it from the key), so it's required here.
import { z } from "zod";
import { VERTICAL_KEY_MAX, VERTICAL_KEY_PATTERN } from "./verticals.js";

export const verticalValidationSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .min(2, "Display name must be at least 2 characters")
    .max(120, "Display name must be at most 120 characters"),
  name: z
    .string()
    .trim()
    .min(1, "Vertical key is required")
    .min(2, "Vertical key must be at least 2 characters")
    .max(VERTICAL_KEY_MAX, `Vertical key must be at most ${VERTICAL_KEY_MAX} characters`)
    .regex(VERTICAL_KEY_PATTERN, "Use lowercase letters and numbers, separated by single underscores"),
});
