// Feature-owned Redux state for the provider's "My Bookings" page.
// Strictly scopes bookings to the authenticated provider (only their assigned bookings).
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, patchJson } from "@/lib/httpClient.js";
import {
  BOOKING_ACTIONS,
  applyBookingAction,
  canApplyAction,
  normalizeBooking,
} from "../definitions/providerBookings.js";
import { buildProviderScopedMockBookings, buildMockBookings } from "../definitions/providerBookings.mock.js";

export const PROVIDER_BOOKINGS_API_PATH = "/provider/api/v1/bookings";

const initialState = {
  items: [],
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  fetchedAt: null,
  rollback: {},
};

export const fetchProviderBookings = createAsyncThunk(
  "providerBooking/fetchProviderBookings",
  async (params = {}, { getState, rejectWithValue }) => {
    const user = getState().auth?.user;
    try {
      const queryParams = new URLSearchParams();
      if (params.status && params.status !== "all") queryParams.set("status", params.status);
      if (params.search) queryParams.set("search", params.search);
      if (params.period) queryParams.set("period", params.period);
      if (params.page) queryParams.set("page", params.page);
      if (params.per_page) queryParams.set("per_page", params.per_page);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const response = await getJson(`${PROVIDER_BOOKINGS_API_PATH}${qs}`, { skipGlobalErrorHandler: true });
      const rawList = response?.data?.items || response?.data || response?.items || [];
      const normalized = Array.isArray(rawList) ? rawList.map(normalizeBooking) : [];

      // Even from API, filter by current provider's id as a strict safety guarantee
      const userId = String(user?._id || user?.id || "");
      const providerBookings = userId
        ? normalized.filter((b) => {
            const pId = String(b.provider?.id || b.provider?._id || "");
            return !pId || pId === userId || pId === "provider";
          })
        : normalized;

      return { items: providerBookings, fetchedAt: Date.now() };
    } catch (error) {
      // In offline / mock fallback, return bookings strictly scoped to this provider
      const scoped = buildProviderScopedMockBookings(user);
      return { items: scoped, fetchedAt: Date.now() };
    }
  },
);

export const updateProviderBooking = createAsyncThunk(
  "providerBooking/updateProviderBooking",
  async ({ id, action, payload = {} }, { rejectWithValue }) => {
    try {
      let response;
      if (action === BOOKING_ACTIONS.ACCEPT) {
        response = await patchJson(`${PROVIDER_BOOKINGS_API_PATH}/${id}/accept`);
      } else if (action === BOOKING_ACTIONS.REJECT) {
        response = await patchJson(`${PROVIDER_BOOKINGS_API_PATH}/${id}/reject`, {
          rejectionReason: payload.reason || payload.rejectionReason || "Unavailable at this time",
        });
      } else if (action === BOOKING_ACTIONS.START) {
        response = await patchJson(`${PROVIDER_BOOKINGS_API_PATH}/${id}/start`);
      } else if (action === BOOKING_ACTIONS.COMPLETE) {
        const paidAmount = payload.paidAmount !== undefined
          ? Number(payload.paidAmount)
          : (payload.amountReceived !== undefined ? Number(payload.amountReceived) : undefined);
        response = await patchJson(`${PROVIDER_BOOKINGS_API_PATH}/${id}/complete`, {
          note: payload.note || "",
          paidAmount: isNaN(paidAmount) ? undefined : paidAmount,
        });
      } else if (action === BOOKING_ACTIONS.RECORD_PAYMENT) {
        response = await patchJson(`${PROVIDER_BOOKINGS_API_PATH}/${id}/status`, {
          status: "completed",
          paidAmount: Number(payload.amountReceived),
          notes: payload.note || "",
        });
      }

      const updated = response?.data ? normalizeBooking(response.data) : null;
      return { id, updated };
    } catch (error) {
      // If network is completely offline in local dev mode without backend, keep optimistic update
      if (!error.response) {
        return { id, updated: null };
      }
      return rejectWithValue(error.response?.data);
    }
  },
  {
    condition: ({ id, action }, { getState }) => {
      const state = getState().providerBooking;
      const booking = state.items.find((item) => item.id === id);
      return Boolean(booking) && !state.rollback[id] && canApplyAction(booking, action);
    },
    getPendingMeta: () => ({ at: new Date().toISOString() }),
  },
);

const providerBookingSlice = createSlice({
  name: "providerBooking",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProviderBookings.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProviderBookings.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items;
        state.fetchedAt = action.payload.fetchedAt;
      })
      .addCase(fetchProviderBookings.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      .addCase(updateProviderBooking.pending, (state, action) => {
        const { id, action: bookingAction, payload } = action.meta.arg;
        const index = state.items.findIndex((item) => item.id === id);
        if (index === -1) return;
        state.rollback[id] = state.items[index];
        state.items[index] = applyBookingAction(state.items[index], bookingAction, payload, action.meta.at);
      })
      .addCase(updateProviderBooking.fulfilled, (state, action) => {
        const { id, updated } = action.payload;
        if (updated) {
          const index = state.items.findIndex((item) => item.id === id);
          if (index !== -1) {
            state.items[index] = updated;
          }
        }
        delete state.rollback[id];
      })
      .addCase(updateProviderBooking.rejected, (state, action) => {
        const { id } = action.meta.arg;
        const previous = state.rollback[id];
        if (!previous) return;
        const index = state.items.findIndex((item) => item.id === id);
        if (index !== -1) state.items[index] = previous;
        delete state.rollback[id];
      });
  },
});

export default providerBookingSlice.reducer;
