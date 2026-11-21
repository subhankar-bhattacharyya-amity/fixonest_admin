// Feature-owned Redux state for Blog Category Management (Super Admin only).
// Every blog category API call goes through a createAsyncThunk here - no
// component calls httpClient directly. Errors are already toasted globally by
// httpClient.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/httpClient.js";
import { BLOG_CATEGORY_API_PATH, BLOG_CATEGORIES_PER_PAGE } from "../definitions/blogCategories.js";

const EMPTY_SUMMARY = { total: 0, active: 0, inactive: 0 };

const initialState = {
  items: [],
  meta: { page: 1, perPage: BLOG_CATEGORIES_PER_PAGE, total: 0, totalPages: 0 },
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' - the table's status
  error: null,
  summary: { data: EMPTY_SUMMARY, status: "idle" },
};

const fail = (error, rejectWithValue) => rejectWithValue(error.response?.data);

// -> blog_category.controller.js getAllBlogCategories (GET, paginated, newest
// first). Filters: search (name/slug) and status ("Active" | "Inactive").
export const fetchBlogCategories = createAsyncThunk(
  "blogCategory/fetchBlogCategories",
  async ({ page = 1, perPage = BLOG_CATEGORIES_PER_PAGE, search, status } = {}, { rejectWithValue }) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (search?.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    try {
      return await getJson(`${BLOG_CATEGORY_API_PATH}?${params}`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> getBlogCategorySummary (GET /summary). { total, active, inactive }.
export const fetchBlogCategorySummary = createAsyncThunk(
  "blogCategory/fetchBlogCategorySummary",
  async (_, { rejectWithValue }) => {
    try {
      return await getJson(`${BLOG_CATEGORY_API_PATH}/summary`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> createBlogCategory (POST). payload: { name, slug?, description? }. No
// status is sent, so the backend creates it Active.
export const createBlogCategory = createAsyncThunk(
  "blogCategory/createBlogCategory",
  async (payload, { rejectWithValue }) => {
    try {
      return await postJson(BLOG_CATEGORY_API_PATH, payload);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> updateBlogCategory (PATCH /:id). payload: at least one of
// { name, slug, description, status }. A changed name re-derives the slug on
// the backend unless a slug is sent with it.
export const updateBlogCategory = createAsyncThunk(
  "blogCategory/updateBlogCategory",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await patchJson(`${BLOG_CATEGORY_API_PATH}/${id}`, payload);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> changeBlogCategoryStatus (PATCH /status/:id). status: "Active" | "Inactive".
export const updateBlogCategoryStatus = createAsyncThunk(
  "blogCategory/updateBlogCategoryStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      return await patchJson(`${BLOG_CATEGORY_API_PATH}/status/${id}`, { status });
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> deleteBlogCategory (DELETE /remove/:id). A soft delete; responds with a
// message only.
export const deleteBlogCategory = createAsyncThunk(
  "blogCategory/deleteBlogCategory",
  async (id, { rejectWithValue }) => {
    try {
      const response = await deleteJson(`${BLOG_CATEGORY_API_PATH}/remove/${id}`);
      return { ...response, id };
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// Merge an updated category into its row, if it's on the current page.
const mergeRow = (state, action) => {
  const updated = action.payload.data;
  const index = state.items.findIndex((item) => item._id === updated?._id);
  if (index !== -1) state.items[index] = updated;
};

const blogCategorySlice = createSlice({
  name: "blogCategory",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBlogCategories.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchBlogCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.data ?? [];
        state.meta = action.payload.meta ?? initialState.meta;
      })
      .addCase(fetchBlogCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      .addCase(fetchBlogCategorySummary.pending, (state) => {
        state.summary.status = "loading";
      })
      .addCase(fetchBlogCategorySummary.fulfilled, (state, action) => {
        state.summary.status = "succeeded";
        state.summary.data = { ...EMPTY_SUMMARY, ...action.payload.data };
      })
      .addCase(fetchBlogCategorySummary.rejected, (state) => {
        state.summary.status = "failed";
      })

      // Patch rows in place so the UI updates instantly; the page still
      // refetches afterwards to keep filters, counts and ordering exact.
      .addCase(updateBlogCategory.fulfilled, mergeRow)
      .addCase(updateBlogCategoryStatus.fulfilled, mergeRow)
      .addCase(deleteBlogCategory.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload.id);
      });
  },
});

export default blogCategorySlice.reducer;
