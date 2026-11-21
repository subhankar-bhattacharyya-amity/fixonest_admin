// Feature-owned Redux state for Provider Management (Super Admin and Admin).
// Every provider API call goes through a createAsyncThunk here - no component
// calls httpClient directly. Errors are already toasted globally by httpClient.
//
// Each thunk picks its base path from the logged-in role
// (getState().auth.role, same approach as authSlice.js): a Super Admin calls
// /super-admin/api/v1/providers, an Admin /admin/api/v1/providers - where the
// backend limits them to providers assigned to a service category of their
// own vertical.
// createProvider and deleteProvider are Super Admin only and are only
// dispatched from UI the page shows to a Super Admin; the backend doesn't
// route them for an Admin.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, postJson, putJson, patchJson, deleteJson } from "@/lib/httpClient.js";
import { ROLES } from "@/features/auth/index.js";
import { PROVIDER_API_PATHS, PROVIDERS_PER_PAGE } from "../definitions/providers.js";

const EMPTY_SUMMARY = { total: 0, active: 0, suspended: 0 };

const initialState = {
  items: [],
  meta: { page: 1, perPage: PROVIDERS_PER_PAGE, total: 0, totalPages: 0 },
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' - the table's status
  error: null,
  summary: { data: EMPTY_SUMMARY, status: "idle" },
};

const apiPath = (getState) => PROVIDER_API_PATHS[getState().auth.role];

const fail = (error, rejectWithValue) => rejectWithValue(error.response?.data);

// -> providers.controller.js getAllProviders (GET, paginated). Filters:
// search and accountStatus.
export const fetchProviders = createAsyncThunk(
  "provider/fetchProviders",
  async (
    { page = 1, perPage = PROVIDERS_PER_PAGE, search, accountStatus } = {},
    { getState, rejectWithValue },
  ) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (search?.trim()) params.set("search", search.trim());
    if (accountStatus) params.set("accountStatus", accountStatus);
    try {
      return await getJson(`${apiPath(getState)}?${params}`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> getProviderSummary (GET /summary). { total, active, suspended } for the
// providers this role can see.
export const fetchProviderSummary = createAsyncThunk(
  "provider/fetchProviderSummary",
  async (_, { getState, rejectWithValue }) => {
    try {
      return await getJson(`${apiPath(getState)}/summary`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// Super Admin only -> createProvider (POST). payload: { fullName, email,
// phone, password }. The provider can sign in straight away.
export const createProvider = createAsyncThunk(
  "provider/createProvider",
  async (payload, { getState, rejectWithValue }) => {
    try {
      return await postJson(apiPath(getState), payload);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> updateProvider (PUT, id in body). payload: at least one of
// { fullName, email, phone }.
export const updateProvider = createAsyncThunk(
  "provider/updateProvider",
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      return await putJson(apiPath(getState), { id, ...payload });
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> updateProviderStatus (PATCH /status). accountStatus: "active" | "suspended".
export const updateProviderStatus = createAsyncThunk(
  "provider/updateProviderStatus",
  async ({ id, accountStatus }, { getState, rejectWithValue }) => {
    try {
      return await patchJson(`${apiPath(getState)}/status`, { id, accountStatus });
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// Super Admin only -> updateProviderRating (PATCH /ratings). payload: at
// least one of { ratings (0-5, one decimal), review_count }. Shown on the
// customer site's Workers pages. Never dispatched for an Admin - the backend
// doesn't route it for them.
export const updateProviderRating = createAsyncThunk(
  "provider/updateProviderRating",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await patchJson(`${PROVIDER_API_PATHS[ROLES.SUPER_ADMIN]}/ratings`, { id, ...payload });
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// Super Admin only -> deleteProvider (DELETE, id in body). A soft delete that
// the backend refuses (409) while the provider is assigned to any service
// category - that message is toasted globally by httpClient.
export const deleteProvider = createAsyncThunk(
  "provider/deleteProvider",
  async (id, { getState, rejectWithValue }) => {
    try {
      const response = await deleteJson(apiPath(getState), { data: { id } });
      return { ...response, id };
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// Swap an updated provider into the table in place, if it's there.
const replaceRow = (state, action) => {
  const updated = action.payload.data;
  const index = state.items.findIndex((item) => item._id === updated?._id);
  if (index !== -1) state.items[index] = updated;
};

const providerSlice = createSlice({
  name: "provider",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProviders.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProviders.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.data ?? [];
        state.meta = action.payload.meta ?? initialState.meta;
      })
      .addCase(fetchProviders.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      .addCase(fetchProviderSummary.pending, (state) => {
        state.summary.status = "loading";
      })
      .addCase(fetchProviderSummary.fulfilled, (state, action) => {
        state.summary.status = "succeeded";
        state.summary.data = { ...EMPTY_SUMMARY, ...action.payload.data };
      })
      .addCase(fetchProviderSummary.rejected, (state) => {
        state.summary.status = "failed";
      })

      // Patch rows in place so the UI updates instantly; the page still
      // refetches afterwards to keep filters, counts and ordering exact.
      .addCase(updateProvider.fulfilled, replaceRow)
      .addCase(updateProviderStatus.fulfilled, replaceRow)
      .addCase(updateProviderRating.fulfilled, replaceRow)
      .addCase(deleteProvider.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload.id);
      });
  },
});

export default providerSlice.reducer;
