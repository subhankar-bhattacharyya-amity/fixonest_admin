import { useMemo } from "react";
import { useSelector } from "react-redux";
import { ROLES } from "@/features/auth/index.js";
import { ADMIN_DEMO_VERTICAL_ID } from "../definitions/adminBookings.mock.js";

// The bookings the logged-in user may see: the Super Admin sees every
// vertical, an Admin only their own.
const scopeBookings = (items, role, user) => {
  if (role !== ROLES.ADMIN || !Array.isArray(items)) return items || [];

  // If real API data came from backend, the backend has already scoped it!
  const hasBackendVerticalIds = items.some((b) => b.vertical?.id && /^[0-9a-fA-F]{24}$/.test(b.vertical.id));
  if (hasBackendVerticalIds) {
    return items;
  }

  // For offline mock data, filter to the admin's vertical
  const adminVerticalId = user?.vertical_id?._id || user?.vertical_id?.id || user?.vertical_id;
  const adminVerticalName = (user?.vertical_id?.name || user?.vertical_id?.display_name || "").toLowerCase();

  return items.filter((item) => {
    if (!item.vertical) return false;
    if (adminVerticalId && (item.vertical.id === adminVerticalId || item.vertical._id === adminVerticalId)) return true;
    if (adminVerticalName && item.vertical.name && item.vertical.name.toLowerCase() === adminVerticalName) return true;
    return item.vertical.id === ADMIN_DEMO_VERTICAL_ID;
  });
};

// Read-only view of the adminBooking slice ({ items, status, error, fetchedAt,
// rollback }) with `items` scoped to the viewer, plus `isSuperAdmin`.
export function useAdminBookings() {
  const state = useSelector((root) => root.adminBooking);
  const role = useSelector((root) => root.auth.role);
  const user = useSelector((root) => root.auth.user);
  const items = useMemo(() => scopeBookings(state.items, role, user), [state.items, role, user]);
  return { ...state, items, isSuperAdmin: role === ROLES.SUPER_ADMIN };
}

// Bookings a provider rejected - they need a new provider. Drives the sidebar
// badge for the Super Admin and Admins.
export function useRejectedBookingCount() {
  const role = useSelector((root) => root.auth.role);
  const user = useSelector((root) => root.auth.user);
  return useSelector(
    (root) => scopeBookings(root.adminBooking.items, role, user).filter((item) => item.status === "rejected").length,
  );
}
