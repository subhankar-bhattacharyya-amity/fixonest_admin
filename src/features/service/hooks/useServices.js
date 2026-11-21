import { useSelector } from "react-redux";

// Read-only access to the service slice (listing, summary and category options).
export function useServices() {
  return useSelector((state) => state.service);
}
