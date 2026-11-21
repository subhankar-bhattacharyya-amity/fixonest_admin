// Mirrors fixonest_backend/app/modules/provider_availability/validator/provider_availability.validator.js
// (createUnavailabilitySchema / rejectUnavailabilitySchema / approveUnavailabilitySchema),
// plus the repository's "at least MIN_NOTICE_DAYS ahead" rule for providers.
import { z } from "zod";
import { MIN_NOTICE_DAYS, NOTE_MAX, REASON_MAX, earliestTimeOffDate } from "./providerAvailability.js";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const timeOffRequestSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    isFullDay: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    reason: z
      .string()
      .trim()
      .min(3, "Tell your admin briefly why")
      .max(REASON_MAX, `Reason must be at most ${REASON_MAX} characters`),
  })
  .superRefine((values, ctx) => {
    if (values.date && values.date < earliestTimeOffDate()) {
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: `Pick a date at least ${MIN_NOTICE_DAYS} days from today`,
      });
    }
    if (values.isFullDay) return;
    if (!TIME_REGEX.test(values.startTime)) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "From time is required" });
    }
    if (!TIME_REGEX.test(values.endTime)) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "To time is required" });
    }
    if (TIME_REGEX.test(values.startTime) && TIME_REGEX.test(values.endTime) && values.startTime >= values.endTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "Must be later than the from time" });
    }
  });

export const rejectTimeOffSchema = z.object({
  rejectReason: z
    .string()
    .trim()
    .min(3, "Tell the provider why")
    .max(NOTE_MAX, `Reason must be at most ${NOTE_MAX} characters`),
});
