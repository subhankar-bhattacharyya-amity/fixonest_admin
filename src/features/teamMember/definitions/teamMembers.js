import { BadgeCheck, EyeOff } from "lucide-react";
import { appConfig } from "@/lib/config.js";

// fixonest_backend/app/router/super_admin/team_management.routes.js - Super Admin only.
export const TEAM_MEMBER_API_PATH = "/super-admin/api/v1/team-members";

// Page size used while loading every member (the backend caps per_page at
// 100). A team is small, so the page loads it all and searches, filters and
// reorders it in the browser.
export const TEAM_MEMBER_FETCH_SIZE = 100;

// Mirrors fixonest_backend/app/constant/status.js.
export const TEAM_MEMBER_STATUS = { ACTIVE: "Active", INACTIVE: "Inactive" };

export const TEAM_MEMBER_STATUSES = {
  [TEAM_MEMBER_STATUS.ACTIVE]: {
    label: "Live",
    icon: BadgeCheck,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    dot: "bg-emerald-500",
  },
  [TEAM_MEMBER_STATUS.INACTIVE]: {
    label: "Hidden",
    icon: EyeOff,
    badge: "bg-slate-100 text-slate-600 ring-slate-500/15",
    dot: "bg-slate-400",
  },
};

export const getTeamMemberStatus = (status) =>
  TEAM_MEMBER_STATUSES[status] ?? TEAM_MEMBER_STATUSES[TEAM_MEMBER_STATUS.ACTIVE];

// Limits from team_management.validator.js.
export const TEAM_MEMBER_NAME_MAX = 100;
export const TEAM_MEMBER_DESIGNATION_MAX = 100;
export const TEAM_MEMBER_LINKEDIN_MAX = 300;

// One-click job titles offered under the Designation field.
export const DESIGNATION_SUGGESTIONS = [
  "Co-founder & CEO",
  "Co-founder & CTO",
  "Head of Operations",
  "Head of Customer Success",
  "Head of Marketing",
  "Lead Engineer",
];

// The photo: the multipart field the backend's uploadTeamMemberAvatar reads,
// and the types/size its multer config accepts.
export const TEAM_MEMBER_AVATAR_FIELD = "avatar";
export const TEAM_MEMBER_AVATAR_TYPES = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
export const TEAM_MEMBER_AVATAR_MAX_BYTES = 5 * 1024 * 1024;

// `avatar` is an upload path served by the backend ("uploads/team/<file>")
// or an absolute http(s) URL. null when empty.
export const buildTeamMemberAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  return `${appConfig.apiBaseUrl}/${avatar.replace(/^\/+/, "")}`;
};

// "linkedin.com/in/ritika" -> "https://linkedin.com/in/ritika". Empty stays empty.
export const normalizeLinkedinUrl = (value = "") => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

// A short, readable form of a profile URL for cards: "linkedin.com/in/ritika".
export const shortLinkedinLabel = (url = "") =>
  url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "");
