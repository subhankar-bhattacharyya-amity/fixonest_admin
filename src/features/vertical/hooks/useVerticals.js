import { useSelector } from "react-redux";

// Read-only access to the vertical slice's listing state.
export function useVerticals() {
  return useSelector((state) => state.vertical);
}
