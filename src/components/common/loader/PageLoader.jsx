import { BrandLogo } from "../brandLogo/index.js";

// Shown by app/App.jsx's single Suspense boundary while a lazy-loaded page
// chunk is fetched, so it covers every route the same way - a spinning teal
// ring around the Fixonest "F" mark, matching the sidebar/login branding.
export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-4 border-slate-200" />
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-teal-500 border-r-teal-500" />
        <BrandLogo />
      </div>
    </div>
  );
}
