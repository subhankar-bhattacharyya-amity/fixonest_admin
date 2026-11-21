import { useMemo } from "react";
import { useSelector } from "react-redux";

// Read-only view of the providerBooking slice ({ items, status, error, fetchedAt, rollback }).
// Guarantees that a provider can see ONLY his/her assigned bookings list.
export function useProviderBookings() {
  const state = useSelector((root) => root.providerBooking);
  const user = useSelector((root) => root.auth.user);
  const role = useSelector((root) => root.auth.role);

  const items = useMemo(() => {
    if (role !== "provider" || !user) return state.items;
    const userId = String(user._id || user.id || "").trim();
    const userName = String(user.fullName || user.name || "").trim().toLowerCase();
    const userPhone = String(user.phone || user.mobileNumber || "").replace(/\D/g, "");

    return state.items.filter((item) => {
      const p = item.provider;
      if (!p) return false;
      if (userId && (String(p.id) === userId || String(p._id) === userId)) return true;
      if (userName && p.name && p.name.trim().toLowerCase() === userName) return true;
      if (userPhone && p.phone && p.phone.replace(/\D/g, "").endsWith(userPhone.slice(-10))) return true;
      return false;
    });
  }, [state.items, user, role]);

  return { ...state, items };
}

// How many requests are waiting for this particular provider's answer - the sidebar badge.
export function usePendingBookingCount() {
  const state = useSelector((root) => root.providerBooking);
  const user = useSelector((root) => root.auth.user);
  const role = useSelector((root) => root.auth.role);

  return useMemo(() => {
    if (role !== "provider" || !user) {
      return state.items.filter((item) => item.status === "pending").length;
    }
    const userId = String(user._id || user.id || "").trim();
    const userName = String(user.fullName || user.name || "").trim().toLowerCase();
    const userPhone = String(user.phone || "").replace(/\D/g, "");

    return state.items.filter((item) => {
      if (item.status !== "pending") return false;
      const p = item.provider;
      if (!p) return false;
      if (userId && (String(p.id) === userId || String(p._id) === userId)) return true;
      if (userName && p.name && p.name.trim().toLowerCase() === userName) return true;
      if (userPhone && p.phone && p.phone.replace(/\D/g, "").endsWith(userPhone.slice(-10))) return true;
      return false;
    }).length;
  }, [state.items, user, role]);
}
