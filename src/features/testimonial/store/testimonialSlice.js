// Feature-owned Redux state for Testimonial Management (Super Admin only).
// Every testimonial API call goes through a createAsyncThunk here - no
// component calls httpClient directly. Errors are already toasted globally by
// httpClient.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/httpClient.js";
import {
  TESTIMONIAL_API_PATH,
  TESTIMONIAL_FETCH_SIZE,
  TESTIMONIAL_AVATAR_FIELD,
} from "../definitions/testimonials.js";

const initialState = { items: [], status: "idle", error: null }; // status: 'idle' | 'loading' | 'succeeded' | 'failed'

const fail = (error, rejectWithValue) => rejectWithValue(error.response?.data);

// Create and update are multipart requests: the text fields plus, when one
// was picked, the photo under the field the backend's uploader reads.
// `avatar: ""` (no file) asks the backend to remove the current photo.
const toFormData = ({ avatarFile, ...fields }) => {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  if (avatarFile) formData.append(TESTIMONIAL_AVATAR_FIELD, avatarFile);
  return formData;
};

// -> testimonials.controller.js getAllTestimonials (GET). Every testimonial
// in display order (`order`, then newest first), loaded page by page.
export const fetchTestimonials = createAsyncThunk("testimonial/fetchTestimonials", async (_, { rejectWithValue }) => {
  try {
    const items = [];
    let page = 1;
    let totalPages = 1;
    do {
      const params = new URLSearchParams({
        sort: "order_asc",
        page: String(page),
        per_page: String(TESTIMONIAL_FETCH_SIZE),
      });
      const response = await getJson(`${TESTIMONIAL_API_PATH}?${params}`);
      items.push(...(response.data ?? []));
      totalPages = response.meta?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);
    return items;
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> createTestimonial (POST, multipart). payload: { name, rating, quote,
// service?, location?, order, status, avatarFile? }.
export const createTestimonial = createAsyncThunk(
  "testimonial/createTestimonial",
  async (payload, { rejectWithValue }) => {
    try {
      return await postJson(TESTIMONIAL_API_PATH, toFormData(payload));
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> updateTestimonial (PATCH /:id, multipart). payload: at least one of
// { name, rating, quote, service, location, status, avatar: "", avatarFile }.
export const updateTestimonial = createAsyncThunk(
  "testimonial/updateTestimonial",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await patchJson(`${TESTIMONIAL_API_PATH}/${id}`, toFormData(payload));
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> changeTestimonialStatus (PATCH /status/:id). status: "Active" | "Inactive".
export const updateTestimonialStatus = createAsyncThunk(
  "testimonial/updateTestimonialStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      return await patchJson(`${TESTIMONIAL_API_PATH}/status/${id}`, { status });
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> deleteTestimonial (DELETE /remove/:id). A soft delete; responds with a message only.
export const deleteTestimonial = createAsyncThunk(
  "testimonial/deleteTestimonial",
  async ({ id }, { rejectWithValue }) => {
    try {
      const response = await deleteJson(`${TESTIMONIAL_API_PATH}/remove/${id}`);
      return { ...response, id };
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// Saves a new carousel order: `items` is every testimonial in its new order.
// Only those whose position changed are PATCHed, each to `order: <1-based
// position>`. The list is reordered right away (pending) so the move feels
// instant; if a request fails the page reloads the list.
export const reorderTestimonials = createAsyncThunk(
  "testimonial/reorderTestimonials",
  async ({ items }, { rejectWithValue }) => {
    try {
      const changed = items
        .map((testimonial, index) => ({ testimonial, order: index + 1 }))
        .filter(({ testimonial, order }) => testimonial.order !== order);
      await Promise.all(
        changed.map(({ testimonial, order }) => patchJson(`${TESTIMONIAL_API_PATH}/${testimonial._id}`, { order })),
      );
      return changed.length;
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// Merge an updated testimonial into its row.
const mergeRow = (state, action) => {
  const updated = action.payload.data;
  const index = state.items.findIndex((item) => item._id === updated?._id);
  if (index !== -1) state.items[index] = updated;
};

const testimonialSlice = createSlice({
  name: "testimonial",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTestimonials.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTestimonials.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchTestimonials.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      .addCase(createTestimonial.fulfilled, (state, action) => {
        if (action.payload.data) state.items.push(action.payload.data);
      })
      .addCase(updateTestimonial.fulfilled, mergeRow)
      .addCase(updateTestimonialStatus.fulfilled, mergeRow)
      .addCase(deleteTestimonial.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload.id);
      })

      .addCase(reorderTestimonials.pending, (state, action) => {
        state.items = action.meta.arg.items.map((testimonial, index) => ({ ...testimonial, order: index + 1 }));
      });
  },
});

export default testimonialSlice.reducer;
