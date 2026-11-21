import { useSelector } from "react-redux";

// Read-only access to the provider slice (table + summary).
export function useProviders() {
  return useSelector((state) => state.provider);
}
