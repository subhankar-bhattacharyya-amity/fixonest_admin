// The Fixonest "F" mark - same shape as fixonest_frontend's logo (bold white
// "F" in a rounded gradient square), recolored to this panel's teal brand
// (the Login button's teal-500 -> teal-600 gradient) instead of the customer
// site's indigo/fuchsia. Decorative: every place it's used already shows the
// "Fixonest" name next to or below it. public/favicon.svg is the same mark.
const SIZES = {
  md: "h-10 w-10 rounded-xl text-xl",
  lg: "h-16 w-16 sm:h-20 sm:w-20 rounded-2xl text-3xl sm:text-4xl",
};

export default function BrandLogo({ size = "md", className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center bg-linear-to-br from-teal-500 to-teal-600 font-bold text-white shadow-lg shadow-teal-500/20 ${SIZES[size]} ${className}`}
    >
      F
    </span>
  );
}
