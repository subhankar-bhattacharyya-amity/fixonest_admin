// Feature-owned Redux state for Customer Management (Super Admin only).
// Every customer API call goes through a createAsyncThunk here - no component
// calls httpClient directly. Errors are already toasted globally by httpClient.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, patchJson } from "@/lib/httpClient.js";
import { CUSTOMER_API_PATH, CUSTOMERS_PER_PAGE } from "../definitions/customers.js";

const EMPTY_SUMMARY = { total: 0, active: 0, suspended: 0 };

const initialState = {
  items: [],
  meta: { page: 1, perPage: CUSTOMERS_PER_PAGE, total: 0, totalPages: 0 },
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' - the table's status
  error: null,
  summary: { data: EMPTY_SUMMARY, status: "idle" },
  // The customer open in the details dialog, with user_details (addresses).
  details: { data: null, status: "idle" },
};

const fail = (error, rejectWithValue) => rejectWithValue(error.response?.data);

// -> customer.controller.js getAllCustomers (GET, paginated). Filters: search
// and accountStatus.
export const fetchCustomers = createAsyncThunk(
  "customer/fetchCustomers",
  async ({ page = 1, perPage = CUSTOMERS_PER_PAGE, search, accountStatus } = {}, { rejectWithValue }) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (search?.trim()) params.set("search", search.trim());
    if (accountStatus) params.set("accountStatus", accountStatus);
    try {
      return await getJson(`${CUSTOMER_API_PATH}?${params}`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> getCustomerSummary (GET /summary). { total, active, suspended }.
export const fetchCustomerSummary = createAsyncThunk(
  "customer/fetchCustomerSummary",
  async (_, { rejectWithValue }) => {
    try {
      return await getJson(`${CUSTOMER_API_PATH}/summary`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> getCustomerDetails (GET /details?id=). The customer plus user_details
// (their saved addresses), or user_details: null if they have none yet.
export const fetchCustomerDetails = createAsyncThunk(
  "customer/fetchCustomerDetails",
  async (id, { rejectWithValue }) => {
    try {
      return await getJson(`${CUSTOMER_API_PATH}/details?id=${encodeURIComponent(id)}`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> updateCustomerStatus (PATCH /status). accountStatus: "active" | "suspended".
export const updateCustomerStatus = createAsyncThunk(
  "customer/updateCustomerStatus",
  async ({ id, accountStatus }, { rejectWithValue }) => {
    try {
      return await patchJson(`${CUSTOMER_API_PATH}/status`, { id, accountStatus });
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    clearCustomerDetails: (state) => {
      state.details = initialState.details;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.data ?? [];
        state.meta = action.payload.meta ?? initialState.meta;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      .addCase(fetchCustomerSummary.pending, (state) => {
        state.summary.status = "loading";
      })
      .addCase(fetchCustomerSummary.fulfilled, (state, action) => {
        state.summary.status = "succeeded";
        state.summary.data = { ...EMPTY_SUMMARY, ...action.payload.data };
      })
      .addCase(fetchCustomerSummary.rejected, (state) => {
        state.summary.status = "failed";
      })

      .addCase(fetchCustomerDetails.pending, (state) => {
        state.details = { data: null, status: "loading" };
      })
      .addCase(fetchCustomerDetails.fulfilled, (state, action) => {
        state.details = { data: action.payload.data ?? null, status: "succeeded" };
      })
      .addCase(fetchCustomerDetails.rejected, (state) => {
        state.details.status = "failed";
      })

      // Patch the row (and the open details dialog) in place so the UI updates
      // instantly; the page still refetches to keep filters and counts exact.
      .addCase(updateCustomerStatus.fulfilled, (state, action) => {
        const updated = action.payload.data;
        const index = state.items.findIndex((item) => item._id === updated?._id);
        if (index !== -1) state.items[index] = updated;
        if (state.details.data?._id === updated?._id) {
          // The status response has no user_details - keep the ones already loaded.
          state.details.data = { ...state.details.data, ...updated };
        }
      });
  },
});

export const { clearCustomerDetails } = customerSlice.actions;

export default customerSlice.reducer;
