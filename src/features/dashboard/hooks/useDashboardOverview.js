import { useSelector } from "react-redux";

// Read-only selector hook for the active role's dashboard overview
export function useDashboardOverview() {
  return useSelector((state) => state.dashboard.overview);
}
