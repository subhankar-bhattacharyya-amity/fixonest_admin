import { useSelector } from "react-redux";

// Read-only access to the contact slice (the full inbox).
export function useContacts() {
  return useSelector((state) => state.contact);
}
