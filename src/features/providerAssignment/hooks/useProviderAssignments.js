import { useSelector } from "react-redux";

// Read-only access to the provider assignment slice (providers, categories
// and assignments, as loaded).
export function useProviderAssignments() {
  return useSelector((state) => state.providerAssignment);
}
