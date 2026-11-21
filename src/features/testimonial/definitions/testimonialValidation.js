// Mirrors fixonest_backend/app/modules/testimonials/validator/testimonials.validator.js
// (createTestimonialSchema / updateTestimonialSchema). The edit form is always
// pre-filled, so required fields stay required; only changed ones are sent.
// The photo is picked outside react-hook-form (it's a File, not text).
import { z } from "zod";
import {
  TESTIMONIAL_NAME_MAX,
  TESTIMONIAL_LOCATION_MAX,
  TESTIMONIAL_SERVICE_MAX,
  TESTIMONIAL_QUOTE_MAX,
} from "./testimonials.js";

export const testimonialValidationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Customer name is required")
    .max(TESTIMONIAL_NAME_MAX, `Name must be at most ${TESTIMONIAL_NAME_MAX} characters`),
  service: z
    .string()
    .trim()
    .max(TESTIMONIAL_SERVICE_MAX, `Service must be at most ${TESTIMONIAL_SERVICE_MAX} characters`),
  location: z
    .string()
    .trim()
    .max(TESTIMONIAL_LOCATION_MAX, `Location must be at most ${TESTIMONIAL_LOCATION_MAX} characters`),
  rating: z.number().int().min(1, "Pick a rating from 1 to 5 stars").max(5),
  quote: z
    .string()
    .trim()
    .min(1, "The review text is required")
    .max(TESTIMONIAL_QUOTE_MAX, `Review must be at most ${TESTIMONIAL_QUOTE_MAX} characters`),
  isActive: z.boolean(),
});
