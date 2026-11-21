// Feature-owned Redux state for Vertical Management (Super Admin only). Every
// vertical API call goes through a createAsyncThunk here - no component calls
// httpClient directly. Errors are already toasted globally by httpClient.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, postJson, putJson, deleteJson } from "@/lib/httpClient.js";
import { VERTICAL_API_PATH, VERTICALS_PER_PAGE } from "../definitions/verticals.js";

const initialState = {
  items: [],
  meta: { page: 1, perPage: VERTICALS_PER_PAGE, total: 0, totalPages: 0 },
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' - the listing's status
  error: null,
};

// -> vertical.controller.js getAllVerticals (GET, paginated). Responds with
// `data` (this page's verticals, newest first) and `meta`
// ({ page, perPage, total, totalPages }).
export const fetchVerticals = createAsyncThunk(
  "vertical/fetchVerticals",
  async ({ page = 1, perPage = VERTICALS_PER_PAGE } = {}, { rejectWithValue }) => {
    try {
      return await getJson(`${VERTICAL_API_PATH}?page=${page}&per_page=${perPage}`);
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

// -> getVerticalById (GET /:id). Used by the edit modal to load fresh details;
// the result is returned to the caller, not stored.
export const fetchVerticalById = createAsyncThunk("vertical/fetchVerticalById", async (id, { rejectWithValue }) => {
  try {
    return await getJson(`${VERTICAL_API_PATH}/${id}`);
  } catch (error) {
    return rejectWithValue(error.response?.data);
  }
});

// -> createVertical (POST). payload: { name, display_name? }.
export const createVertical = createAsyncThunk("vertical/createVertical", async (payload, { rejectWithValue }) => {
  try {
    return await postJson(VERTICAL_API_PATH, payload);
  } catch (error) {
    return rejectWithValue(error.response?.data);
  }
});

// -> updateVertical (PUT /:id). payload: at least one of { name, display_name }.
export const updateVertical = createAsyncThunk(
  "vertical/updateVertical",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await putJson(`${VERTICAL_API_PATH}/${id}`, payload);
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

// -> deleteVertical (DELETE /:id). Responds with a message only.
export const deleteVertical = createAsyncThunk("vertical/deleteVertical", async (id, { rejectWithValue }) => {
  try {
    const response = await deleteJson(`${VERTICAL_API_PATH}/${id}`);
    return { ...response, id };
  } catch (error) {
    return rejectWithValue(error.response?.data);
  }
});

const verticalSlice = createSlice({
  name: "vertical",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVerticals.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchVerticals.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.data ?? [];
        state.meta = action.payload.meta ?? initialState.meta;
      })
      .addCase(fetchVerticals.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      // Patch the row in place so the table updates instantly; the page
      // still refetches afterwards to keep counts and ordering exact.
      .addCase(updateVertical.fulfilled, (state, action) => {
        const updated = action.payload.data;
        const index = state.items.findIndex((item) => item._id === updated?._id);
        if (index !== -1) state.items[index] = updated;
      })
      .addCase(deleteVertical.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload.id);
      });
  },
});

export default verticalSlice.reducer;
