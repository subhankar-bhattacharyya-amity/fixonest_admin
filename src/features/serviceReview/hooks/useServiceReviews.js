import { useSelector } from "react-redux";

// Read-only access to the service review slice (listing, summary, service options).
export function useServiceReviews() {
  return useSelector((state) => state.serviceReview);
}
