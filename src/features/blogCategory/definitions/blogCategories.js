import { BadgeCheck, EyeOff } from "lucide-react";

// fixonest_backend/app/router/super_admin/blog_category.routes.js - Super
// Admin only. The backend has no Admin route for blog categories, so an Admin
// has nothing to call here.
export const BLOG_CATEGORY_API_PATH = "/super-admin/api/v1/blog-categories";

// Rows per page of the listing (paged, searched and filtered by the server).
export const BLOG_CATEGORIES_PER_PAGE = 10;

// Mirrors fixonest_backend/app/constant/status.js.
export const BLOG_CATEGORY_STATUS = { ACTIVE: "Active", INACTIVE: "Inactive" };

export const BLOG_CATEGORY_STATUSES = {
  [BLOG_CATEGORY_STATUS.ACTIVE]: {
    label: "Active",
    icon: BadgeCheck,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    dot: "bg-emerald-500",
  },
  [BLOG_CATEGORY_STATUS.INACTIVE]: {
    label: "Inactive",
    icon: EyeOff,
    badge: "bg-slate-100 text-slate-600 ring-slate-500/15",
    dot: "bg-slate-400",
  },
};

export const getBlogCategoryStatus = (status) =>
  BLOG_CATEGORY_STATUSES[status] ?? BLOG_CATEGORY_STATUSES[BLOG_CATEGORY_STATUS.ACTIVE];

// Same limits as blog_category.validator.js.
export const BLOG_CATEGORY_NAME_MIN = 2;
export const BLOG_CATEGORY_NAME_MAX = 120;
export const BLOG_CATEGORY_SLUG_MAX = 150;
export const BLOG_CATEGORY_DESCRIPTION_MAX = 500;

// Lowercase letters/digits separated by single hyphens - blog_category.validator.js's slugRule.
export const BLOG_CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// "Home Care & Tips" -> "home-care-and-tips". The form always sends the slug
// it shows, so the backend never has to derive a different one from the name.
export const slugifyBlogCategoryName = (value = "") =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, BLOG_CATEGORY_SLUG_MAX)
    .replace(/-+$/, "");
