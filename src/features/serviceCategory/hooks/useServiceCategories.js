import { useSelector } from "react-redux";

// Read-only access to the service category slice (the full listing).
export function useServiceCategories() {
  return useSelector((state) => state.serviceCategory);
}
