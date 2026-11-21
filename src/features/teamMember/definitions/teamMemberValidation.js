// Mirrors fixonest_backend/app/modules/team_management/validator/team_management.validator.js
// (createTeamMemberSchema / updateTeamMemberSchema). The edit form is always
// pre-filled, so required fields stay required; only changed ones are sent.
// The photo is picked outside react-hook-form (it's a File, not text).
import { z } from "zod";
import {
  TEAM_MEMBER_NAME_MAX,
  TEAM_MEMBER_DESIGNATION_MAX,
  TEAM_MEMBER_LINKEDIN_MAX,
  normalizeLinkedinUrl,
} from "./teamMembers.js";

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
};

export const teamMemberValidationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(TEAM_MEMBER_NAME_MAX, `Name must be at most ${TEAM_MEMBER_NAME_MAX} characters`),
  designation: z
    .string()
    .trim()
    .min(1, "Designation is required")
    .max(TEAM_MEMBER_DESIGNATION_MAX, `Designation must be at most ${TEAM_MEMBER_DESIGNATION_MAX} characters`),
  // Typed without "https://" is fine - it's added before saving.
  linkedin: z
    .string()
    .transform(normalizeLinkedinUrl)
    .pipe(
      z
        .string()
        .max(TEAM_MEMBER_LINKEDIN_MAX, `Link must be at most ${TEAM_MEMBER_LINKEDIN_MAX} characters`)
        .refine((value) => !value || isHttpUrl(value), "Enter a valid profile link, e.g. linkedin.com/in/name"),
    ),
  isActive: z.boolean(),
});
