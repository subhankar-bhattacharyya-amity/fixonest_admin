import { useSelector } from "react-redux";

// Read-only access to the customer slice (table + summary + open details).
export function useCustomers() {
  return useSelector((state) => state.customer);
}
