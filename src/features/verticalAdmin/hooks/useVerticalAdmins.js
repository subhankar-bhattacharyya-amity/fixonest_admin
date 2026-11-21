import { useSelector } from "react-redux";

// Read-only access to the vertical-admin slice (table + overview).
export function useVerticalAdmins() {
  return useSelector((state) => state.verticalAdmin);
}
