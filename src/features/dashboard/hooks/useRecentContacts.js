import { useSelector } from "react-redux";

// Read-only access to the dashboard slice's newest contact messages.
export function useRecentContacts() {
  return useSelector((state) => state.dashboard.recentContacts);
}
