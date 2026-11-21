import { Wrench, House, Layers } from "lucide-react";

// fixonest_backend/app/router/super_admin/vertical.routes.js - every endpoint
// requires a Super Admin token.
export const VERTICAL_API_PATH = "/super-admin/api/v1/verticals";

// Page size requested from the backend's paginated listing (it caps
// per_page server-side anyway).
export const VERTICALS_PER_PAGE = 10;

// Mirrors vertical.model.js / vertical.validator.js: a vertical's `name` is a
// unique lowercase snake_case key, 2-60 characters.
export const VERTICAL_KEY_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
export const VERTICAL_KEY_MAX = 60;

// Icons for the verticals seeded by default; any other vertical gets the
// generic icon and a colour picked from its key, so it stays the same on
// every render.
const PRESET_ICONS = { repair_service: Wrench, household_service: House };
const TONES = [
  "bg-teal-50 text-teal-600 ring-teal-100",
  "bg-sky-50 text-sky-600 ring-sky-100",
  "bg-violet-50 text-violet-600 ring-violet-100",
  "bg-amber-50 text-amber-600 ring-amber-100",
  "bg-rose-50 text-rose-600 ring-rose-100",
  "bg-emerald-50 text-emerald-600 ring-emerald-100",
];

export function getVerticalVisual(name = "") {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return { icon: PRESET_ICONS[name] ?? Layers, tone: TONES[hash % TONES.length] };
}

// "Beauty & Wellness!" -> "beauty_wellness" - suggests a valid key from a
// display name.
export const toVerticalKey = (text = "") =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, VERTICAL_KEY_MAX)
    .replace(/_+$/, "");

// Same result as the backend's formatEnumLabel(name, "upper")
// (app/helper/formatEnumLabel.js) - what vertical.model.js stores as
// display_name when none is given.
export const getDefaultDisplayName = (name) => (name ? name.split("_").join(" ").toUpperCase() : "");
