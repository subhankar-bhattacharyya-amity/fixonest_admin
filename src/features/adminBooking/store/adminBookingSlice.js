// Feature-owned Redux state for "Booking Management" (Super Admin + Admin).
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, patchJson } from "@/lib/httpClient.js";
import { ROLES } from "@/features/auth/index.js";
import {
  ADMIN_BOOKING_ACTIONS,
  applyAdminAction,
  canAdminAct,
} from "../definitions/adminBookings.js";
import { normalizeBooking } from "@/features/providerBooking/definitions/bookingNormalizer.js";
import { ADMIN_DEMO_VERTICAL_ID, buildAdminMockBookings } from "../definitions/adminBookings.mock.js";

export const ADMIN_BOOKINGS_API_PATH = "/admin/api/v1/bookings";
export const SUPER_ADMIN_BOOKINGS_API_PATH = "/super-admin/api/v1/bookings";

const initialState = {
  items: [],
  meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  fetchedAt: null,
  rollback: {},
};

const getBasePath = (role) => (role === ROLES.ADMIN ? ADMIN_BOOKINGS_API_PATH : SUPER_ADMIN_BOOKINGS_API_PATH);

export const fetchAdminBookings = createAsyncThunk(
  "adminBooking/fetchAdminBookings",
  async (params = {}, { getState, rejectWithValue }) => {
    const role = getState().auth.role;
    const user = getState().auth.user;
    const basePath = getBasePath(role);
    try {
      const queryParams = new URLSearchParams();
      if (params.status && params.status !== "all") queryParams.set("status", params.status);
      if (params.search) queryParams.set("search", params.search);
      if (params.vertical_id) queryParams.set("vertical_id", params.vertical_id);
      if (params.provider_id) queryParams.set("provider_id", params.provider_id);
      if (params.category) queryParams.set("category", params.category);
      if (params.period) queryParams.set("period", params.period);
      if (params.page) queryParams.set("page", params.page);
      queryParams.set("per_page", String(params.per_page || 100));

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const response = await getJson(`${basePath}${qs}`, { skipGlobalErrorHandler: true });
      const rawList = response?.data?.items || response?.data || response?.items || [];
      const normalized = Array.isArray(rawList) ? rawList.map(normalizeBooking) : [];
      const meta = response?.meta || { total: normalized.length, page: 1, limit: normalized.length, totalPages: 1 };
      return { items: normalized, meta, fetchedAt: Date.now() };
    } catch (error) {
      // Offline fallback: return standard demo dataset scoped appropriately
      const existing = getState().adminBooking?.items;
      if (existing && existing.length > 0) {
        return { items: existing, meta: { total: existing.length, page: 1, limit: existing.length, totalPages: 1 }, fetchedAt: Date.now() };
      }
      const all = buildAdminMockBookings();
      if (role === ROLES.ADMIN) {
        const adminVerticalId = user?.vertical_id?._id || user?.vertical_id?.id || user?.vertical_id;
        const adminVerticalName = (user?.vertical_id?.name || user?.vertical_id?.display_name || "").toLowerCase();
        const scoped = all.filter((item) => {
          if (!item.vertical) return false;
          if (adminVerticalId && (item.vertical.id === adminVerticalId || item.vertical._id === adminVerticalId)) return true;
          if (adminVerticalName && item.vertical.name && item.vertical.name.toLowerCase() === adminVerticalName) return true;
          return item.vertical.id === ADMIN_DEMO_VERTICAL_ID;
        });
        return { items: scoped, meta: { total: scoped.length, page: 1, limit: scoped.length, totalPages: 1 }, fetchedAt: Date.now() };
      }
      return { items: all, meta: { total: all.length, page: 1, limit: all.length, totalPages: 1 }, fetchedAt: Date.now() };
    }
  },
  {
    condition: (params, { getState }) => {
      const status = getState().adminBooking?.status;
      if (status === "loading" && !params?.force) {
        return false;
      }
      return true;
    },
  },
);

export const updateAdminBooking = createAsyncThunk(
  "adminBooking/updateAdminBooking",
  async ({ id, action, payload = {} }, { getState, rejectWithValue }) => {
    const role = getState().auth.role;
    const basePath = getBasePath(role);
    try {
      let response;
      if (action === ADMIN_BOOKING_ACTIONS.REASSIGN) {
        const providerId = payload.provider?._id || payload.provider?.id;
        response = await patchJson(`${basePath}/${id}/reassign`, {
          provider_id: providerId,
          providerId,
          note: payload.note || "",
        });
      } else if (action === ADMIN_BOOKING_ACTIONS.CANCEL) {
        response = await patchJson(`${basePath}/${id}/cancel`, {
          cancellationReason: payload.reason || "Cancelled by admin",
        });
      } else if (action === ADMIN_BOOKING_ACTIONS.ACCEPT) {
        response = await patchJson(`${basePath}/${id}/accept`);
      } else if (action === ADMIN_BOOKING_ACTIONS.REJECT) {
        response = await patchJson(`${basePath}/${id}/reject`, {
          rejectionReason: payload.reason || "Rejected by administrator",
        });
      }

      const updated = response?.data ? normalizeBooking(response.data) : null;
      return { id, updated };
    } catch (error) {
      if (!error.response) {
        return { id, updated: null };
      }
      return rejectWithValue(error.response?.data);
    }
  },
  {
    condition: ({ id, action }, { getState }) => {
      const state = getState().adminBooking;
      const booking = state.items.find((item) => item.id === id);
      return Boolean(booking) && !state.rollback[id] && canAdminAct(booking, action);
    },
    getPendingMeta: () => ({ at: new Date().toISOString() }),
  },
);

const adminBookingSlice = createSlice({
  name: "adminBooking",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminBookings.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAdminBookings.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items;
        if (action.payload.meta) state.meta = action.payload.meta;
        state.fetchedAt = action.payload.fetchedAt;
      })
      .addCase(fetchAdminBookings.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      .addCase(updateAdminBooking.pending, (state, action) => {
        const { id, action: adminAction, payload } = action.meta.arg;
        const index = state.items.findIndex((item) => item.id === id);
        if (index === -1) return;
        state.rollback[id] = state.items[index];
        state.items[index] = applyAdminAction(state.items[index], adminAction, payload, action.meta.at);
      })
      .addCase(updateAdminBooking.fulfilled, (state, action) => {
        const { id, updated } = action.payload;
        if (updated) {
          const index = state.items.findIndex((item) => item.id === id);
          if (index !== -1) {
            state.items[index] = updated;
          }
        }
        delete state.rollback[id];
      })
      .addCase(updateAdminBooking.rejected, (state, action) => {
        const { id } = action.meta.arg;
        const previous = state.rollback[id];
        if (!previous) return;
        const index = state.items.findIndex((item) => item.id === id);
        if (index !== -1) state.items[index] = previous;
        delete state.rollback[id];
      });
  },
});

export default adminBookingSlice.reducer;
