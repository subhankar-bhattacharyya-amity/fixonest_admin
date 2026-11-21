// Feature-owned Redux state for Reviews & Ratings Management (Super Admin and
// Admin). Every API call goes through a createAsyncThunk here - no component
// calls httpClient directly. Errors are already toasted globally by httpClient.
//
// Each thunk picks its base path from the logged-in role (getState().auth.role):
// a Super Admin calls /super-admin/api/v1/service-reviews, an Admin
// /admin/api/v1/service-reviews (where the backend limits them to their vertical).
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/httpClient.js";
import {
  SERVICE_REVIEW_API_PATHS,
  REVIEW_SERVICE_OPTION_API_PATHS,
  REVIEW_SERVICE_OPTION_FETCH_SIZE,
  SERVICE_REVIEWS_PER_PAGE,
  SERVICE_REVIEW_STATUS,
} from "../definitions/serviceReviews.js";

const EMPTY_SUMMARY = {
  total: 0,
  visible: 0,
  hidden: 0,
  withComment: 0,
  average: 0,
  distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
};

const initialState = {
  items: [],
  meta: { page: 1, perPage: SERVICE_REVIEWS_PER_PAGE, total: 0, totalPages: 0 },
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' - the listing's status
  requestId: null,
  summary: { data: EMPTY_SUMMARY, status: "idle" },
  // Every service the viewer may manage, for the filter and the add form.
  services: { items: [], status: "idle" },
};

const apiPath = (getState) => SERVICE_REVIEW_API_PATHS[getState().auth.role];

const fail = (error, rejectWithValue) => rejectWithValue(error.response?.data);

// -> getAllReviewRatings (GET, paginated). Each entry: { _id, rating, status,
// reviewedAt, comment, hasComment, service { _id, name, slug, image_url },
// category { _id, name }, customer { _id, fullName, email, profile_image } }.
export const fetchServiceReviews = createAsyncThunk(
  "serviceReview/fetchServiceReviews",
  async (
    { page = 1, perPage = SERVICE_REVIEWS_PER_PAGE, search, serviceId, rating, status, writtenOnly, sort } = {},
    { getState, rejectWithValue },
  ) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (search?.trim()) params.set("search", search.trim());
    if (serviceId) params.set("serviceId", serviceId);
    if (rating) params.set("rating", String(rating));
    if (status) params.set("status", status);
    if (writtenOnly) params.set("hasComment", "true");
    if (sort) params.set("sort", sort);
    try {
      return await getJson(`${apiPath(getState)}?${params}`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> getReviewRatingSummary (GET /summary).
export const fetchServiceReviewSummary = createAsyncThunk(
  "serviceReview/fetchServiceReviewSummary",
  async (_, { getState, rejectWithValue }) => {
    try {
      return await getJson(`${apiPath(getState)}/summary`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> service.controller.js getAllServices, every page of it - the services
// the viewer may manage. Skipped when already loaded.
export const fetchReviewServiceOptions = createAsyncThunk(
  "serviceReview/fetchReviewServiceOptions",
  async (_, { getState, rejectWithValue }) => {
    const path = REVIEW_SERVICE_OPTION_API_PATHS[getState().auth.role];
    try {
      const items = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await getJson(`${path}?page=${page}&per_page=${REVIEW_SERVICE_OPTION_FETCH_SIZE}&sort=a_z`);
        items.push(...(response.data ?? []));
        totalPages = response.meta?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages);
      return items.map((service) => ({
        _id: service._id,
        name: service.name,
        image_url: service.image_url,
        status: service.status,
        categoryName: service.category_data?.name ?? "",
      }));
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
  {
    condition: (_, { getState }) => {
      const { status } = getState().serviceReview.services;
      return status !== "loading" && status !== "succeeded";
    },
  },
);

// -> getCustomerOptions (GET /customers). Registered customers matching the
// search; with serviceId, alreadyRated marks who has reviewed that service.
// The picker keeps its own results, so this isn't stored in the slice.
export const searchReviewCustomers = createAsyncThunk(
  "serviceReview/searchReviewCustomers",
  async ({ search = "", serviceId } = {}, { getState, rejectWithValue }) => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (serviceId) params.set("serviceId", serviceId);
    try {
      const response = await getJson(`${apiPath(getState)}/customers?${params}`);
      return response.data ?? [];
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> createReviewRating (POST, JSON). payload: { serviceId, customerId,
// rating, comment, status, reviewedAt }. A second review by the same customer
// for the same service is refused (409, toasted globally).
export const createServiceReview = createAsyncThunk(
  "serviceReview/createServiceReview",
  async (payload, { getState, rejectWithValue }) => {
    try {
      return await postJson(apiPath(getState), payload);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> updateReviewRating (PATCH /:id). changes: any of { rating, comment,
// status, reviewedAt }; comment "" keeps the rating but removes the text.
export const updateServiceReview = createAsyncThunk(
  "serviceReview/updateServiceReview",
  async ({ id, changes }, { getState, rejectWithValue }) => {
    try {
      return await patchJson(`${apiPath(getState)}/${id}`, changes);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> changeReviewRatingStatus (PATCH /status/:id). Flips at once (pending) and
// flips back if the request fails.
export const setServiceReviewStatus = createAsyncThunk(
  "serviceReview/setServiceReviewStatus",
  async ({ id, status }, { getState, rejectWithValue }) => {
    try {
      return await patchJson(`${apiPath(getState)}/status/${id}`, { status });
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> deleteReviewRating (DELETE /remove/:id). A soft delete; message only.
export const deleteServiceReview = createAsyncThunk(
  "serviceReview/deleteServiceReview",
  async (id, { getState, rejectWithValue }) => {
    try {
      const response = await deleteJson(`${apiPath(getState)}/remove/${id}`);
      return { ...response, id };
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

const setRowStatus = (state, id, status) => {
  const row = state.items.find((item) => item._id === id);
  if (row) row.status = status;
};
const opposite = (status) =>
  status === SERVICE_REVIEW_STATUS.VISIBLE ? SERVICE_REVIEW_STATUS.HIDDEN : SERVICE_REVIEW_STATUS.VISIBLE;

const serviceReviewSlice = createSlice({
  name: "serviceReview",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchServiceReviews.pending, (state, action) => {
        state.status = "loading";
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchServiceReviews.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.status = "succeeded";
        state.items = action.payload.data ?? [];
        state.meta = action.payload.meta ?? initialState.meta;
      })
      .addCase(fetchServiceReviews.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.status = "failed";
      })

      .addCase(fetchServiceReviewSummary.pending, (state) => {
        state.summary.status = "loading";
      })
      .addCase(fetchServiceReviewSummary.fulfilled, (state, action) => {
        state.summary.status = "succeeded";
        state.summary.data = { ...EMPTY_SUMMARY, ...action.payload.data };
      })
      .addCase(fetchServiceReviewSummary.rejected, (state) => {
        state.summary.status = "failed";
      })

      .addCase(fetchReviewServiceOptions.pending, (state) => {
        state.services.status = "loading";
      })
      .addCase(fetchReviewServiceOptions.fulfilled, (state, action) => {
        state.services.status = "succeeded";
        state.services.items = action.payload;
      })
      .addCase(fetchReviewServiceOptions.rejected, (state) => {
        state.services.status = "failed";
      })

      .addCase(setServiceReviewStatus.pending, (state, action) => {
        setRowStatus(state, action.meta.arg.id, action.meta.arg.status);
      })
      .addCase(setServiceReviewStatus.rejected, (state, action) => {
        setRowStatus(state, action.meta.arg.id, opposite(action.meta.arg.status));
      })
      .addCase(updateServiceReview.fulfilled, (state, action) => {
        const updated = action.payload.data;
        const index = state.items.findIndex((item) => item._id === updated?._id);
        if (index !== -1) state.items[index] = updated;
      })
      .addCase(deleteServiceReview.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload.id);
      });
  },
});

export default serviceReviewSlice.reducer;
