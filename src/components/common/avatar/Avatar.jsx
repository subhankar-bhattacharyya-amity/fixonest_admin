import { useState } from "react";

// First letter of the first two words: "Subhankar Bhattacharyya" -> "SB",
// "Admin" -> "A". Kept here (not imported from a feature) so this dumb
// component works for any person - a user, a provider, a customer row.
function getInitials(name) {
  const words = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

// Reusable round avatar: shows `src` when it's set and loads, otherwise the
// person's initials on the panel's teal tint. Size, border and ring come from
// the caller via `className` (e.g. "h-10 w-10 text-sm"), so the same
// component serves the Topbar, the profile header, and any future list/table.
export default function Avatar({ src, name, alt = "", className = "" }) {
  // Remember which URL failed (not just a boolean) so a newly uploaded photo
  // - a different URL - gets a fresh attempt without resetting any state.
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = Boolean(src) && src !== failedSrc;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-100 font-semibold uppercase text-teal-700 select-none ${className}`}
    >
      {showImage ? (
        <img src={src} alt={alt} onError={() => setFailedSrc(src)} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden={alt ? undefined : true} aria-label={alt || undefined} role={alt ? "img" : undefined}>
          {getInitials(name)}
        </span>
      )}
    </span>
  );
}
