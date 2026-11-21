import { BadgeCheck, EyeOff } from "lucide-react";
import { ROLES } from "@/features/auth/index.js";
import { appConfig } from "@/lib/config.js";

// fixonest_backend/app/router/super_admin/blog.routes.js and
// app/router/admin/blog.routes.js - the same /v1/blogs endpoints under each
// role's base path. Both roles manage every blog.
export const BLOG_API_PATHS = {
  [ROLES.SUPER_ADMIN]: "/super-admin/api/v1/blogs",
  [ROLES.ADMIN]: "/admin/api/v1/blogs",
};

// The categories a blog can be filed under. The Super Admin manages them
// (features/blogCategory); an Admin can only read them, to pick one here.
export const BLOG_CATEGORY_OPTION_API_PATHS = {
  [ROLES.SUPER_ADMIN]: "/super-admin/api/v1/blog-categories",
  [ROLES.ADMIN]: "/admin/api/v1/blog-categories",
};

// Rows per page of the listing (paged, searched and filtered by the server).
export const BLOGS_PER_PAGE = 10;

// Page size used while loading every category for the pickers; the backend
// caps per_page server-side anyway.
export const BLOG_CATEGORY_OPTION_FETCH_SIZE = 100;

// Mirrors fixonest_backend/app/constant/status.js. Blogs are always created
// Active; the panel shows/hides them with isPublished instead (below).
export const BLOG_STATUS = { ACTIVE: "Active", INACTIVE: "Inactive" };

// A blog's isPublished flag: true is live on the customer site ("Published"),
// false is saved but not shown ("Hidden").
export const BLOG_VISIBILITIES = {
  published: {
    label: "Published",
    icon: BadgeCheck,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    dot: "bg-emerald-500",
  },
  hidden: {
    label: "Hidden",
    icon: EyeOff,
    badge: "bg-slate-100 text-slate-600 ring-slate-500/15",
    dot: "bg-slate-400",
  },
};

export const getBlogVisibility = (isPublished) => (isPublished ? BLOG_VISIBILITIES.published : BLOG_VISIBILITIES.hidden);

// blog.repositories.js refuses a 6th popular or a 6th trendy blog.
export const BLOG_HIGHLIGHT_LIMIT = 5;

// Same limits as blog.validator.js.
export const BLOG_TITLE_MIN = 2;
export const BLOG_TITLE_MAX = 255;
export const BLOG_SLUG_MAX = 300;
export const BLOG_EXCERPT_MAX = 300;
export const BLOG_AUTHOR_MIN = 2;
export const BLOG_AUTHOR_MAX = 100;
export const BLOG_TAG_MAX = 50;
export const BLOG_TAGS_LIMIT = 20;
// The backend only asks for 10 characters of content; a real article needs a
// little more than that to be worth publishing.
export const BLOG_CONTENT_MIN_TEXT = 20;

// Lowercase letters/digits separated by single hyphens - blog.validator.js's slugRule.
export const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Upload constraints mirroring fixonest_backend/app/middleware/multer.js's
// ALLOWED_MIMETYPES, DEFAULT_FILE_SIZE_LIMIT and uploadBlogContent's maxCount,
// so a bad file is rejected instantly instead of round-tripping to the server.
export const BLOG_IMAGE_TYPES = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
export const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const BLOG_GALLERY_LIMIT = 10;

// The multipart fields the backend's blog uploaders read files from.
export const BLOG_COVER_FIELD = "coverImage";
export const BLOG_GALLERY_FIELD = "blog_images";
export const BLOG_SINGLE_IMAGE_FIELD = "image_url";

// Image paths are stored relative to the backend's public folder
// ("uploads/blogs/<file>"); null when there is no image.
export const buildBlogImageUrl = (path) => (path ? `${appConfig.apiBaseUrl}/${path.replace(/^\/+/, "")}` : null);

// "5 Signs You Need a Plumber!" -> "5-signs-you-need-a-plumber". The editor
// always sends the slug it shows, so the backend never derives a different one.
export const slugifyBlogTitle = (value = "") =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, BLOG_SLUG_MAX)
    .replace(/-+$/, "");

// The readable text of the editor's HTML - what the word count, the reading
// time and the "is there any content" check are all based on.
export const blogHtmlToText = (html = "") =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

export const countWords = (text = "") => (text.trim() ? text.trim().split(/\s+/).length : 0);

// Same 200-words-a-minute rule as blog.repositories.js, which stores the real
// value on save - this one only previews it while writing.
export const estimateReadingTime = (title, html) => Math.max(1, Math.ceil(countWords(`${title} ${blogHtmlToText(html)}`) / 200));
