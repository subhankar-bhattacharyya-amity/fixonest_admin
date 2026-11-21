// Mirrors fixonest_backend/app/modules/faq/validator/faq.validator.js
// (createFaqSchema / updateFaqSchema). The edit form is always pre-filled, so
// every field stays required; only the changed ones are actually sent.
import { z } from "zod";
import { FAQ_QUESTION_MAX, FAQ_ANSWER_MAX } from "./faqs.js";

export const faqValidationSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Question is required")
    .max(FAQ_QUESTION_MAX, `Question must be at most ${FAQ_QUESTION_MAX} characters`),
  answer: z
    .string()
    .trim()
    .min(1, "Answer is required")
    .max(FAQ_ANSWER_MAX, `Answer must be at most ${FAQ_ANSWER_MAX} characters`),
  isActive: z.boolean(),
});
