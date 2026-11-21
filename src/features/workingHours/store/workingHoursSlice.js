// Feature-owned Redux state for Settings' "Manage Holidays" and "Business
// Working Hours" (Super Admin only). Every working-hours API call goes
// through a createAsyncThunk here - no component calls httpClient directly.
// Errors are already toasted globally by httpClient.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/httpClient.js";
import { WORKING_HOURS_API_PATHS } from "../definitions/workingHours.js";

// `config` is the platform-default working-hours document: weeklySchedule,
// slotSettings, timezone and holidays (sorted by date).
const initialState = { config: null, status: "idle", error: null }; // status: 'idle' | 'loading' | 'succeeded' | 'failed'

const apiPath = (getState) => {
  const role = getState().auth?.role;
  return role === "admin" ? WORKING_HOURS_API_PATHS.admin : WORKING_HOURS_API_PATHS.super_admin;
};

const fail = (error, rejectWithValue) => rejectWithValue(error.response?.data);

const byDate = (a, b) => a.date.localeCompare(b.date);

// -> working_hours.controller.js getWorkingHours (GET). The backend creates
// the default document on first read, so this always returns one.
export const fetchWorkingHours = createAsyncThunk("workingHours/fetch", async (_, { getState, rejectWithValue }) => {
  try {
    return await getJson(apiPath(getState));
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> updateWorkingHours (PATCH). payload: { weeklySchedule, slotSettings }.
// Breaks are sent without their `_id` - Joi strips it, and the backend
// replaces each day's breaks with what it receives.
export const saveWorkingHours = createAsyncThunk("workingHours/save", async (payload, { getState, rejectWithValue }) => {
  try {
    const body = {
      slotSettings: payload.slotSettings,
      weeklySchedule: payload.weeklySchedule.map((day) => ({
        day: day.day,
        dayIndex: day.dayIndex,
        isOpen: day.isOpen,
        openTime: day.openTime,
        closeTime: day.closeTime,
        breaks: day.breaks.map((item) => ({
          title: item.title?.trim() || "Break",
          startTime: item.startTime,
          endTime: item.endTime,
        })),
      })),
    };
    return await patchJson(apiPath(getState), body);
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> addHoliday (POST /holidays). Responds with the new holiday.
export const addHoliday = createAsyncThunk("workingHours/addHoliday", async (payload, { getState, rejectWithValue }) => {
  try {
    return await postJson(`${apiPath(getState)}/holidays`, payload);
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> updateHoliday (PATCH /holidays/:holidayId). Responds with the updated holiday.
export const updateHoliday = createAsyncThunk("workingHours/updateHoliday", async ({ id, payload }, { getState, rejectWithValue }) => {
  try {
    return await patchJson(`${apiPath(getState)}/holidays/${id}`, payload);
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> deleteHoliday (DELETE /holidays/:holidayId). Responds with a message only.
export const deleteHoliday = createAsyncThunk("workingHours/deleteHoliday", async (id, { getState, rejectWithValue }) => {
  try {
    const response = await deleteJson(`${apiPath(getState)}/holidays/${id}`);
    return { ...response, id };
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

const workingHoursSlice = createSlice({
  name: "workingHours",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkingHours.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchWorkingHours.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.config = action.payload.data;
      })
      .addCase(fetchWorkingHours.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      .addCase(saveWorkingHours.fulfilled, (state, action) => {
        state.config = action.payload.data;
      })

      .addCase(addHoliday.fulfilled, (state, action) => {
        if (!state.config) return;
        state.config.holidays = [...state.config.holidays, action.payload.data].sort(byDate);
      })
      .addCase(updateHoliday.fulfilled, (state, action) => {
        if (!state.config) return;
        const updated = action.payload.data;
        state.config.holidays = state.config.holidays
          .map((holiday) => (holiday._id === updated._id ? updated : holiday))
          .sort(byDate);
      })
      .addCase(deleteHoliday.fulfilled, (state, action) => {
        if (!state.config) return;
        state.config.holidays = state.config.holidays.filter((holiday) => holiday._id !== action.payload.id);
      });
  },
});

export default workingHoursSlice.reducer;
