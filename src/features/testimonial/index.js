// Public API of the testimonial feature. Import from
// "@/features/testimonial/index.js", never reach into hooks/, store/, or
// definitions/ from outside this folder.
export { useTestimonials } from "./hooks/useTestimonials.js";
export {
  TESTIMONIAL_STATUS,
  TESTIMONIAL_STATUSES,
  TESTIMONIAL_NAME_MAX,
  TESTIMONIAL_LOCATION_MAX,
  TESTIMONIAL_SERVICE_MAX,
  TESTIMONIAL_QUOTE_MAX,
  TESTIMONIAL_AVATAR_TYPES,
  TESTIMONIAL_AVATAR_MAX_BYTES,
  RATING_LABELS,
  getTestimonialStatus,
  buildTestimonialAvatarUrl,
} from "./definitions/testimonials.js";
export { testimonialValidationSchema } from "./definitions/testimonialValidation.js";
export {
  default as testimonialReducer,
  fetchTestimonials,
  createTestimonial,
  updateTestimonial,
  updateTestimonialStatus,
  deleteTestimonial,
  reorderTestimonials,
} from "./store/testimonialSlice.js";
