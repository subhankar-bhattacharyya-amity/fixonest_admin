// Feature-owned Redux state for provider time off (unavailability requests).
// Every API call goes through a createAsyncThunk here - no component calls
// httpClient directly. Errors are already toasted globally by httpClient.
//
// Two audiences share this slice:
// - the provider's Booking Calendar: `mine` (their own requests) and
//   `calendar` (Fixonest's open days and holidays, from the public API);
// - Provider Management's "Time-off Requests" tab (Super Admin / Admin):
//   `requests` (one page of the table) and `counts` (per-status totals, also
//   the sidebar badge). Those thunks pick /super-admin/api or /admin/api from
//   getState().auth.role and must never be dispatched for a provider - a 401
//   from a request that carries a token logs the user out.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, patchJson, postJson } from "@/lib/httpClient.js";
import { ROLES } from "@/features/auth/index.js";
import {
  PROVIDER_TIME_OFF_CREATE_PATH,
  PUBLIC_WORKING_HOURS_PATH,
  TIME_OFF_API_PATHS,
  TIME_OFF_PER_PAGE,
  TIME_OFF_STATUS,
  todayKey,
} from "../definitions/providerAvailability.js";

const EMPTY_COUNTS = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };

const initialState = {
  mine: { items: [], status: "idle", fetchedAt: null }, // status: 'idle' | 'loading' | 'succeeded' | 'failed'
  calendar: { holidays: [], weeklySchedule: [], status: "idle" },
  requests: { items: [], meta: { page: 1, perPage: TIME_OFF_PER_PAGE, total: 0, totalPages: 0 }, status: "idle" },
  counts: { data: EMPTY_COUNTS, status: "idle" },
};

const fail = (error, rejectWithValue) => rejectWithValue(error.response?.data);
const managementPath = (getState) => TIME_OFF_API_PATHS[getState().auth.role];

// ---- provider ----

// -> listUnavailability (GET /my-requests). Loads every page so the calendar
// can show any month without another request.
export const fetchMyTimeOff = createAsyncThunk("providerAvailability/fetchMine", async (_, { rejectWithValue }) => {
  try {
    const items = [];
    let page = 1;
    let totalPages = 1;
    do {
      const response = await getJson(`${TIME_OFF_API_PATHS[ROLES.PROVIDER]}?page=${page}&per_page=100`);
      items.push(...(response.data ?? []));
      totalPages = response.meta?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);
    return { items, fetchedAt: Date.now() };
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> createUnavailability (POST). payload: { date, isFullDay, startTime?,
// endTime?, reason }. Always created "pending" for a provider.
export const requestTimeOff = createAsyncThunk("providerAvailability/request", async (payload, { rejectWithValue }) => {
  try {
    const body = { date: payload.date, isFullDay: payload.isFullDay, reason: payload.reason.trim() };
    if (!payload.isFullDay) {
      body.startTime = payload.startTime;
      body.endTime = payload.endTime;
    }
    return await postJson(PROVIDER_TIME_OFF_CREATE_PATH, body);
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> cancelUnavailability (PATCH /my-requests/:id/cancel). Withdraws a
// pending request, or gives back an approved day off.
export const withdrawTimeOff = createAsyncThunk("providerAvailability/withdraw", async (id, { rejectWithValue }) => {
  try {
    const response = await patchJson(`${TIME_OFF_API_PATHS[ROLES.PROVIDER]}/${id}/cancel`, {});
    return { ...response, id };
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> working_hours getWorkingHours (public GET). Optional decoration for the
// calendar, so a failure is silent and the calendar still works.
export const fetchBusinessCalendar = createAsyncThunk(
  "providerAvailability/fetchBusinessCalendar",
  async (_, { rejectWithValue }) => {
    try {
      return await getJson(PUBLIC_WORKING_HOURS_PATH, { skipGlobalErrorHandler: true });
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// ---- Super Admin / Admin ----

// -> listUnavailability (GET, paginated). Filters: status, upcoming (from today on).
export const fetchTimeOffRequests = createAsyncThunk(
  "providerAvailability/fetchRequests",
  async ({ page = 1, status, upcoming } = {}, { getState, rejectWithValue }) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(TIME_OFF_PER_PAGE) });
    if (status) params.set("status", status);
    if (upcoming) params.set("startDate", todayKey());
    try {
      return await getJson(`${managementPath(getState)}?${params}`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// Per-status totals (one per_page=1 request each - the API has no summary).
export const fetchTimeOffCounts = createAsyncThunk(
  "providerAvailability/fetchCounts",
  async (_, { getState, rejectWithValue }) => {
    try {
      const path = managementPath(getState);
      const statuses = Object.values(TIME_OFF_STATUS);
      const responses = await Promise.all(
        statuses.map((status) => getJson(`${path}?status=${status}&page=1&per_page=1`, { skipGlobalErrorHandler: true })),
      );
      return Object.fromEntries(statuses.map((status, index) => [status, responses[index].meta?.total ?? 0]));
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> approveUnavailability (PATCH /:id/approve). payload: { notes? }.
export const approveTimeOff = createAsyncThunk(
  "providerAvailability/approve",
  async ({ id, notes }, { getState, rejectWithValue }) => {
    try {
      return await patchJson(`${managementPath(getState)}/${id}/approve`, notes?.trim() ? { notes: notes.trim() } : {});
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> rejectUnavailability (PATCH /:id/reject). payload: { rejectReason }.
export const rejectTimeOff = createAsyncThunk(
  "providerAvailability/reject",
  async ({ id, rejectReason }, { getState, rejectWithValue }) => {
    try {
      return await patchJson(`${managementPath(getState)}/${id}/reject`, { rejectReason: rejectReason.trim() });
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

const replaceRequestRow = (state, action) => {
  const updated = action.payload.data;
  const index = state.requests.items.findIndex((item) => item._id === updated?._id);
  if (index !== -1) state.requests.items[index] = updated;
};

const providerAvailabilitySlice = createSlice({
  name: "providerAvailability",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyTimeOff.pending, (state) => {
        state.mine.status = "loading";
      })
      .addCase(fetchMyTimeOff.fulfilled, (state, action) => {
        state.mine.status = "succeeded";
        state.mine.items = action.payload.items;
        state.mine.fetchedAt = action.payload.fetchedAt;
      })
      .addCase(fetchMyTimeOff.rejected, (state) => {
        state.mine.status = "failed";
      })
      .addCase(requestTimeOff.fulfilled, (state, action) => {
        if (action.payload.data) state.mine.items.push(action.payload.data);
      })
      .addCase(withdrawTimeOff.fulfilled, (state, action) => {
        const record = state.mine.items.find((item) => item._id === action.payload.id);
        if (record) record.status = TIME_OFF_STATUS.CANCELLED;
      })

      .addCase(fetchBusinessCalendar.pending, (state) => {
        state.calendar.status = "loading";
      })
      .addCase(fetchBusinessCalendar.fulfilled, (state, action) => {
        state.calendar.status = "succeeded";
        state.calendar.holidays = action.payload.data?.holidays ?? [];
        state.calendar.weeklySchedule = action.payload.data?.weeklySchedule ?? [];
      })
      .addCase(fetchBusinessCalendar.rejected, (state) => {
        state.calendar.status = "failed";
      })

      .addCase(fetchTimeOffRequests.pending, (state) => {
        state.requests.status = "loading";
      })
      .addCase(fetchTimeOffRequests.fulfilled, (state, action) => {
        state.requests.status = "succeeded";
        state.requests.items = action.payload.data ?? [];
        state.requests.meta = action.payload.meta ?? initialState.requests.meta;
      })
      .addCase(fetchTimeOffRequests.rejected, (state) => {
        state.requests.status = "failed";
      })
      .addCase(fetchTimeOffCounts.pending, (state) => {
        state.counts.status = "loading";
      })
      .addCase(fetchTimeOffCounts.fulfilled, (state, action) => {
        state.counts.status = "succeeded";
        state.counts.data = { ...EMPTY_COUNTS, ...action.payload };
      })
      .addCase(fetchTimeOffCounts.rejected, (state) => {
        state.counts.status = "failed";
      })
      .addCase(approveTimeOff.fulfilled, replaceRequestRow)
      .addCase(rejectTimeOff.fulfilled, replaceRequestRow);
  },
});

export default providerAvailabilitySlice.reducer;
