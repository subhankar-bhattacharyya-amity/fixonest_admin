// Feature-owned Redux state for the logged-in provider's own public profile
// (My Profile's "Provider Details" card). Every call goes through a
// createAsyncThunk here - no component calls httpClient directly. Errors are
// already toasted globally by httpClient. Only dispatched for the provider
// role - the endpoints are under /provider/api.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, putJson } from "@/lib/httpClient.js";
import { PROVIDER_DETAILS_API_PATH, PROVIDER_EXPERTISE_CATEGORIES_API_PATH } from "../definitions/providerProfile.js";

const initialState = {
  details: null, // backend findMyProviderDetails shape, incl. expertise
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  categories: { items: [], status: "idle" }, // the Areas of Experience dropdown
};

const fail = (error, rejectWithValue) => rejectWithValue(error.response?.data);

// -> providers.controller.js getMyProviderDetails (GET).
export const fetchMyProviderDetails = createAsyncThunk(
  "providerProfile/fetchMyProviderDetails",
  async (_, { rejectWithValue }) => {
    try {
      return await getJson(PROVIDER_DETAILS_API_PATH);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> updateMyProviderDetails (PUT). payload: languages, years_experience,
// bio, why_book, per_hours_price, expertise_category_ids (full list - the
// backend stores one record per category).
export const updateMyProviderDetails = createAsyncThunk(
  "providerProfile/updateMyProviderDetails",
  async (payload, { rejectWithValue }) => {
    try {
      return await putJson(PROVIDER_DETAILS_API_PATH, payload);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> getExpertiseCategoryOptions (GET /categories). Every active service
// category. Skipped when already loaded.
export const fetchExpertiseCategories = createAsyncThunk(
  "providerProfile/fetchExpertiseCategories",
  async (_, { rejectWithValue }) => {
    try {
      return await getJson(PROVIDER_EXPERTISE_CATEGORIES_API_PATH);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
  {
    condition: (_, { getState }) => {
      const { status } = getState().providerProfile.categories;
      return status !== "loading" && status !== "succeeded";
    },
  },
);

const providerProfileSlice = createSlice({
  name: "providerProfile",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyProviderDetails.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMyProviderDetails.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.details = action.payload.data ?? null;
      })
      .addCase(fetchMyProviderDetails.rejected, (state) => {
        state.status = "failed";
      })

      .addCase(updateMyProviderDetails.fulfilled, (state, action) => {
        state.details = action.payload.data ?? state.details;
      })

      .addCase(fetchExpertiseCategories.pending, (state) => {
        state.categories.status = "loading";
      })
      .addCase(fetchExpertiseCategories.fulfilled, (state, action) => {
        state.categories.status = "succeeded";
        state.categories.items = action.payload.data ?? [];
      })
      .addCase(fetchExpertiseCategories.rejected, (state) => {
        state.categories.status = "failed";
        state.categories.items = [];
      });
  },
});

export default providerProfileSlice.reducer;
