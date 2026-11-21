// Auth-domain presentation helpers shared by every place an avatar is
// rendered (layouts/topbar/components/ProfileMenu.jsx, pages/profile/*).
import { appConfig } from "@/lib/config.js";

// Every user starts with the backend's shared placeholder
// (fixonest_backend user.model.js's profile_image default,
// "/uploads/user/customer_profile_image/default.png"). That generic silhouette
// isn't *their* photo, so it's treated as "no photo" - the Avatar component
// then shows the user's initials instead.
const DEFAULT_PROFILE_IMAGE_FILE = "default.png";

export function hasCustomProfileImage(user) {
  const image = user?.profileImage || user?.profile_image;
  return Boolean(image) && !image.endsWith(`/${DEFAULT_PROFILE_IMAGE_FILE}`);
}

// Full URL of the user's own uploaded photo, or null when they have none
// (missing, or still the default placeholder) - pass straight to <Avatar src>.
export function buildProfileImageUrl(user) {
  if (!hasCustomProfileImage(user)) return null;
  const image = user.profileImage || user.profile_image;
  if (/^https?:\/\//i.test(image)) return image;
  const path = image.startsWith("/") ? image : `/${image}`;
  return `${appConfig.apiBaseUrl}${path}`;
}

// Upload constraints mirroring fixonest_backend/app/middleware/multer.js's
// ALLOWED_MIMETYPES and DEFAULT_FILE_SIZE_LIMIT, so a bad file is rejected
// instantly instead of round-tripping to the server first.
export const PROFILE_IMAGE_TYPES = ["image/png", "image/jpg", "image/jpeg"];
export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
