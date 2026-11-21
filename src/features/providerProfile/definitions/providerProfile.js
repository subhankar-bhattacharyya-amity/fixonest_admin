// fixonest_backend/app/router/provider/auth.routes.js - the logged-in
// provider's own public profile (shown on the customer site's Workers
// pages). Provider role only.
export const PROVIDER_DETAILS_API_PATH = "/provider/api/v1/provider-details";
export const PROVIDER_EXPERTISE_CATEGORIES_API_PATH = `${PROVIDER_DETAILS_API_PATH}/categories`;

// Same list as fixonest_backend/app/constant/providerLanguages.js.
export const PROVIDER_LANGUAGES = [
  "English",
  "Hindi",
  "Bengali",
  "Tamil",
  "Telugu",
  "Marathi",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Odia",
  "Urdu",
];

export const PROVIDER_BIO_MAX = 1000;
export const PROVIDER_WHY_BOOK_MAX = 6;
export const PROVIDER_WHY_BOOK_ITEM_MAX = 120;
