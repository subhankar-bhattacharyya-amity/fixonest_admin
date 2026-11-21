// Feature-owned Redux state for the dashboard pages (Super Admin, Admin, and Provider).
// Every dashboard API call goes through a createAsyncThunk here - no component
// calls httpClient directly. Errors are already toasted globally by httpClient.
//
// The thunk picks its base path from the logged-in role (getState().auth.role,
// same approach as contactSlice.js).
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson } from "@/lib/httpClient.js";
import { DASHBOARD_API_PATHS, RECENT_CONTACTS_LIMIT } from "../definitions/dashboard.js";

const initialState = {
  // The "Recent Contacts" card. fetchedAt is when it was last loaded - the
  // "now" that relative times ("2h ago") are measured from.
  recentContacts: { items: [], status: "idle", fetchedAt: null },
  // The consolidated role overview (stats, trends, charts, mini lists, snapshot).
  overview: { data: null, status: "idle", error: null, fetchedAt: null },
};

// -> dashboard.controller.js getRecentContacts (GET, newest first). Each row
// is the whole message, in the contact list's row shape { _id, fullName,
// email, subject, message, senderType, user_id, createdAt }, so opening one
// needs no second request.
export const fetchRecentContacts = createAsyncThunk(
  "dashboard/fetchRecentContacts",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiPath = DASHBOARD_API_PATHS[getState().auth.role];
      const response = await getJson(`${apiPath}/recent-contacts?limit=${RECENT_CONTACTS_LIMIT}`);
      return { items: response.data ?? [], fetchedAt: Date.now() };
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

// -> dashboard.controller.js getSuperAdminOverview / getAdminOverview / getProviderOverview (GET)
export const fetchDashboardOverview = createAsyncThunk(
  "dashboard/fetchDashboardOverview",
  async (_, { getState, rejectWithValue }) => {
    try {
      const role = getState().auth.role;
      const apiPath = DASHBOARD_API_PATHS[role];
      if (!apiPath) {
        return rejectWithValue("Unsupported role for dashboard overview");
      }
      const response = await getJson(`${apiPath}/overview`);
      return { data: response.data ?? null, fetchedAt: Date.now() };
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // A failed reload keeps the messages already shown.
      .addCase(fetchRecentContacts.pending, (state) => {
        state.recentContacts.status = "loading";
      })
      .addCase(fetchRecentContacts.fulfilled, (state, action) => {
        state.recentContacts = { ...action.payload, status: "succeeded" };
      })
      .addCase(fetchRecentContacts.rejected, (state) => {
        state.recentContacts.status = "failed";
      })

      // Overview actions
      .addCase(fetchDashboardOverview.pending, (state) => {
        state.overview.status = "loading";
        state.overview.error = null;
      })
      .addCase(fetchDashboardOverview.fulfilled, (state, action) => {
        state.overview.status = "succeeded";
        state.overview.data = action.payload.data;
        state.overview.fetchedAt = action.payload.fetchedAt;
        state.overview.error = null;
      })
      .addCase(fetchDashboardOverview.rejected, (state, action) => {
        state.overview.status = "failed";
        state.overview.error = action.payload || "Failed to load dashboard overview";
      });
  },
});

export default dashboardSlice.reducer;
