import { BadgeCheck, EyeOff, House } from "lucide-react";

// fixonest_backend/app/router/super_admin/faq.routes.js - Super Admin only.
export const FAQ_API_PATH = "/super-admin/api/v1/faqs";

// Page size used while loading every FAQ of a section (the backend caps
// per_page at 100). Sections hold a handful of FAQs, so the page loads them
// all and searches, filters and reorders them in the browser.
export const FAQ_FETCH_SIZE = 100;

// The customer-site pages/sections whose FAQs are managed here - one tab
// each. `category` is the FAQ's `category` field in the backend; the
// customer site asks for the same value (fixonest_frontend's
// features/faq/definitions/faqs.js). Add a section here to get a new tab.
export const FAQ_SECTIONS = [
  {
    id: "home",
    label: "Home Page",
    category: "home_page",
    icon: House,
    description: "The FAQ section near the bottom of the customer site's home page.",
  },
];

export const getFaqSection = (sectionId) => FAQ_SECTIONS.find((section) => section.id === sectionId) ?? FAQ_SECTIONS[0];

// Mirrors fixonest_backend/app/constant/status.js.
export const FAQ_STATUS = { ACTIVE: "Active", INACTIVE: "Inactive" };

export const FAQ_STATUSES = {
  [FAQ_STATUS.ACTIVE]: {
    label: "Live",
    icon: BadgeCheck,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    dot: "bg-emerald-500",
  },
  [FAQ_STATUS.INACTIVE]: {
    label: "Hidden",
    icon: EyeOff,
    badge: "bg-slate-100 text-slate-600 ring-slate-500/15",
    dot: "bg-slate-400",
  },
};

export const getFaqStatus = (status) => FAQ_STATUSES[status] ?? FAQ_STATUSES[FAQ_STATUS.ACTIVE];

// faq.validator.js caps the question at 500 characters. The answer has no
// backend limit; this one keeps answers short enough to read in an accordion.
export const FAQ_QUESTION_MAX = 500;
export const FAQ_ANSWER_MAX = 2000;
