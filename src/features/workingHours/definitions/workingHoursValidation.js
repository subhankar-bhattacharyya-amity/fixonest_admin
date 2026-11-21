// Mirrors fixonest_backend/app/modules/working_hours/validator/working_hours.validator.js
// (addHolidaySchema / updateHolidaySchema / updateWorkingHoursSchema), plus the
// checks Joi doesn't make but a schedule needs: close after open, breaks
// inside opening hours and not overlapping each other.
import { z } from "zod";
import {
  BREAK_TITLE_MAX,
  HOLIDAY_DESCRIPTION_MAX,
  HOLIDAY_TITLE_MAX,
  HOLIDAY_TYPES,
  SLOT_SETTING_FIELDS,
  toMinutes,
} from "./workingHours.js";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const time = (label) => z.string().regex(TIME_REGEX, `${label} is required`);

export const holidayValidationSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    title: z
      .string()
      .trim()
      .min(1, "Give the holiday a name")
      .max(HOLIDAY_TITLE_MAX, `Name must be at most ${HOLIDAY_TITLE_MAX} characters`),
    description: z
      .string()
      .trim()
      .max(HOLIDAY_DESCRIPTION_MAX, `Note must be at most ${HOLIDAY_DESCRIPTION_MAX} characters`),
    type: z.enum(Object.keys(HOLIDAY_TYPES)),
    isClosed: z.boolean(),
    openTime: z.string(),
    closeTime: z.string(),
    recurringAnnually: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.isClosed) return;
    if (!TIME_REGEX.test(values.openTime)) {
      ctx.addIssue({ code: "custom", path: ["openTime"], message: "Opening time is required" });
    }
    if (!TIME_REGEX.test(values.closeTime)) {
      ctx.addIssue({ code: "custom", path: ["closeTime"], message: "Closing time is required" });
    }
    const open = toMinutes(values.openTime);
    const close = toMinutes(values.closeTime);
    if (open !== null && close !== null && close <= open) {
      ctx.addIssue({ code: "custom", path: ["closeTime"], message: "Must be after the opening time" });
    }
  });

const breakSchema = z.object({
  title: z.string().trim().max(BREAK_TITLE_MAX, `At most ${BREAK_TITLE_MAX} characters`),
  startTime: time("Start"),
  endTime: time("End"),
});

const daySchema = z
  .object({
    day: z.string(),
    dayIndex: z.number().int().min(0).max(6),
    isOpen: z.boolean(),
    openTime: time("Opening time"),
    closeTime: time("Closing time"),
    breaks: z.array(breakSchema),
  })
  .superRefine((day, ctx) => {
    // A closed day keeps its times for when it's reopened, so skip the checks.
    if (!day.isOpen) return;
    const open = toMinutes(day.openTime);
    const close = toMinutes(day.closeTime);
    if (open === null || close === null) return;
    if (close <= open) {
      ctx.addIssue({ code: "custom", path: ["closeTime"], message: "Must be after the opening time" });
      return;
    }
    const ranges = day.breaks.map((item) => [toMinutes(item.startTime), toMinutes(item.endTime)]);
    ranges.forEach(([start, end], index) => {
      if (start === null || end === null) return;
      if (end <= start) {
        ctx.addIssue({ code: "custom", path: ["breaks", index, "endTime"], message: "Must end after it starts" });
      } else if (start < open || end > close) {
        ctx.addIssue({ code: "custom", path: ["breaks", index, "startTime"], message: "Must be within opening hours" });
      } else if (ranges.some(([otherStart, otherEnd], other) => other < index && start < otherEnd && end > otherStart)) {
        ctx.addIssue({ code: "custom", path: ["breaks", index, "startTime"], message: "Overlaps another break" });
      }
    });
  });

const slotSettingsShape = Object.fromEntries(
  SLOT_SETTING_FIELDS.map((field) => [
    field.name,
    z
      .number({ error: "Enter a number" })
      .int("Whole numbers only")
      .min(field.min, `At least ${field.min}`)
      .max(field.max, `At most ${field.max}`),
  ]),
);

export const workingHoursValidationSchema = z.object({
  weeklySchedule: z.array(daySchema).length(7),
  slotSettings: z.object(slotSettingsShape),
});
