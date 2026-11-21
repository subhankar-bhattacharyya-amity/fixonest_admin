import { useSelector } from "react-redux";

// Read-only access to the testimonial slice ({ items, status, error }).
// Loading is done by dispatching the slice's thunks.
export function useTestimonials() {
  return useSelector((state) => state.testimonial);
}
