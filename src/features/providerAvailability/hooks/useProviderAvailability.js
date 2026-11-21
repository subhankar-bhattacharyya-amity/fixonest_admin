import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ROLES } from "@/features/auth/index.js";
import { fetchTimeOffCounts } from "../store/providerAvailabilitySlice.js";

// Read-only view of the providerAvailability slice ({ mine, calendar, requests, counts }).
export function useProviderAvailability() {
  return useSelector((state) => state.providerAvailability);
}

// Pending time-off requests waiting for a Super Admin / Admin - the sidebar
// badge on Provider Management. Loads the counts once for those roles only
// (the endpoints don't exist for a provider). Returns 0 for anyone else.
export function usePendingTimeOffCount(role) {
  const dispatch = useDispatch();
  const isManager = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
  const { data, status } = useSelector((state) => state.providerAvailability.counts);

  useEffect(() => {
    if (isManager && status === "idle") dispatch(fetchTimeOffCounts());
  }, [dispatch, isManager, status]);

  return isManager ? data.pending : 0;
}
