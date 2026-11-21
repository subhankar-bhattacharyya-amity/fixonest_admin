// Mirrors fixonest_backend/app/modules/service_reviews_ratings/validator/
// service_reviews_ratings.validator.js. Service and customer are picked when
// adding; on edit they're fixed, so the form keeps them only for display.
import { z } from "zod";
import { SERVICE_REVIEW_COMMENT_MAX } from "./serviceReviews.js";

export const serviceReviewValidationSchema = z.object({
  serviceId: z.string().min(1, "Choose the service being reviewed"),
  customerId: z.string().min(1, "Choose the customer who wrote the review"),
  rating: z
    .number({ error: "Pick a star rating" })
    .int()
    .min(1, "Pick a star rating")
    .max(5, "A rating is at most 5 stars"),
  comment: z
    .string()
    .trim()
    .max(SERVICE_REVIEW_COMMENT_MAX, `Keep the review under ${SERVICE_REVIEW_COMMENT_MAX} characters`),
  reviewedAt: z
    .string()
    .min(1, "Pick the review date")
    .refine((value) => new Date(`${value}T00:00:00`).getTime() <= Date.now(), "The review date can't be in the future"),
  isVisible: z.boolean(),
});
