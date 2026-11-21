// Feature-owned Redux state for Blog Management (Super Admin and Admin).
// Every blog API call goes through a createAsyncThunk here - no component
// calls httpClient directly. Errors are already toasted globally by httpClient.
//
// Each thunk picks its base path from the logged-in role
// (getState().auth.role, same approach as serviceCategorySlice.js): a Super
// Admin calls /super-admin/api/v1/blogs, an Admin /admin/api/v1/blogs.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/httpClient.js";
import {
  BLOG_API_PATHS,
  BLOG_CATEGORY_OPTION_API_PATHS,
  BLOG_CATEGORY_OPTION_FETCH_SIZE,
  BLOGS_PER_PAGE,
  BLOG_COVER_FIELD,
  BLOG_GALLERY_FIELD,
  BLOG_SINGLE_IMAGE_FIELD,
} from "../definitions/blogs.js";

const EMPTY_SUMMARY = { total: 0, active: 0, inactive: 0, published: 0, unpublished: 0, popular: 0, trendy: 0 };

const initialState = {
  items: [],
  meta: { page: 1, perPage: BLOGS_PER_PAGE, total: 0, totalPages: 0 },
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' - the table's status
  error: null,
  summary: { data: EMPTY_SUMMARY, status: "idle" },
  // Every blog category, for the listing's filter and the editor's picker.
  categories: { items: [], status: "idle" },
};

const apiPath = (getState) => BLOG_API_PATHS[getState().auth.role];

const fail = (error, rejectWithValue) => rejectWithValue(error.response?.data);

// -> blog.controller.js getAllBlogs (GET, paginated, newest first). Rows carry
// an excerpt instead of the full content, and blogCategoryId populated as
// { _id, name, slug }. Filters: search (title/slug/excerpt), visibility
// ("published" | "hidden" -> isPublished), blogCategoryId, and highlight
// ("popular" | "trendy").
export const fetchBlogs = createAsyncThunk(
  "blog/fetchBlogs",
  async (
    { page = 1, perPage = BLOGS_PER_PAGE, search, visibility, blogCategoryId, highlight } = {},
    { getState, rejectWithValue },
  ) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (search?.trim()) params.set("search", search.trim());
    if (visibility === "published") params.set("isPublished", "true");
    if (visibility === "hidden") params.set("isPublished", "false");
    if (blogCategoryId) params.set("blogCategoryId", blogCategoryId);
    if (highlight === "popular") params.set("isPopular", "true");
    if (highlight === "trendy") params.set("isTrendy", "true");
    try {
      return await getJson(`${apiPath(getState)}?${params}`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> getBlogSummary (GET /summary). { total, active, inactive, published,
// unpublished, popular, trendy }.
export const fetchBlogSummary = createAsyncThunk("blog/fetchBlogSummary", async (_, { getState, rejectWithValue }) => {
  try {
    return await getJson(`${apiPath(getState)}/summary`);
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> getBlogById (GET /:id). The full blog for the editor: content, plus
// images [{ _id, image_url }] - its gallery.
export const fetchBlogById = createAsyncThunk("blog/fetchBlogById", async (id, { getState, rejectWithValue }) => {
  try {
    return await getJson(`${apiPath(getState)}/${id}`);
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> blog_category.controller.js getAllBlogCategories, every page of it. Both
// the listing's category filter and the editor's category picker need the
// whole list, and it is small.
export const fetchBlogCategoryOptions = createAsyncThunk(
  "blog/fetchBlogCategoryOptions",
  async (_, { getState, rejectWithValue }) => {
    const path = BLOG_CATEGORY_OPTION_API_PATHS[getState().auth.role];
    try {
      const items = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await getJson(`${path}?page=${page}&per_page=${BLOG_CATEGORY_OPTION_FETCH_SIZE}`);
        items.push(...(response.data ?? []));
        totalPages = response.meta?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages);
      return items;
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> createBlog (POST, multipart). payload: { title, slug, content, excerpt?,
// blogCategoryId, writtenBy, tags, isPublished, isPopular, isTrendy, coverFile?,
// galleryFiles? }. Tags go as "tags[]" so a single tag still arrives as an array.
export const createBlog = createAsyncThunk("blog/createBlog", async (payload, { getState, rejectWithValue }) => {
  const { coverFile, galleryFiles = [], tags = [], ...fields } = payload;
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  tags.forEach((tag) => formData.append("tags[]", tag));
  if (coverFile) formData.append(BLOG_COVER_FIELD, coverFile);
  galleryFiles.forEach((file) => formData.append(BLOG_GALLERY_FIELD, file));
  try {
    return await postJson(apiPath(getState), formData);
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// Saves an edited blog. The backend takes a blog's text fields, its cover
// file and its gallery images through separate calls, so this runs them one
// after another and stops at the first that fails:
//   1. changes         -> updateBlog (PATCH /:id, JSON). At least one of the
//                         text fields; coverImage: "" removes the cover.
//   2. coverFile       -> updateBlog (PATCH /:id, multipart) with the new cover.
//   3. removedImageIds -> removeBlogImage (DELETE /:id/images/:imageId).
//   4. galleryFiles    -> addBlogImage (POST /:id/images, one file each).
// Resolves with the last update's response, or a bare message when only the
// gallery changed.
export const updateBlog = createAsyncThunk(
  "blog/updateBlog",
  async ({ id, changes = {}, coverFile, removedImageIds = [], galleryFiles = [] }, { getState, rejectWithValue }) => {
    const path = `${apiPath(getState)}/${id}`;
    try {
      let response = { message: "Blog updated successfully" };
      if (Object.keys(changes).length > 0) response = await patchJson(path, changes);
      if (coverFile) {
        const formData = new FormData();
        formData.append(BLOG_COVER_FIELD, coverFile);
        response = await patchJson(path, formData);
      }
      for (const imageId of removedImageIds) {
        await deleteJson(`${path}/images/${imageId}`);
      }
      for (const file of galleryFiles) {
        const formData = new FormData();
        formData.append(BLOG_SINGLE_IMAGE_FIELD, file);
        await postJson(`${path}/images`, formData);
      }
      return response;
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> changeBlogStatus (PATCH /status/:id). changes: at least one of
// { status, isPublished, isPopular, isTrendy }. The backend refuses a 6th
// popular or trendy blog, or highlighting a hidden one, with a 400 (toasted
// globally by httpClient), and clears both highlights when a blog is hidden.
export const updateBlogFlags = createAsyncThunk(
  "blog/updateBlogFlags",
  async ({ id, changes }, { getState, rejectWithValue }) => {
    try {
      return await patchJson(`${apiPath(getState)}/status/${id}`, changes);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> deleteBlog (DELETE /remove/:id). A soft delete; responds with a message only.
export const deleteBlog = createAsyncThunk("blog/deleteBlog", async (id, { getState, rejectWithValue }) => {
  try {
    const response = await deleteJson(`${apiPath(getState)}/remove/${id}`);
    return { ...response, id };
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

const blogSlice = createSlice({
  name: "blog",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBlogs.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchBlogs.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.data ?? [];
        state.meta = action.payload.meta ?? initialState.meta;
      })
      .addCase(fetchBlogs.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      .addCase(fetchBlogSummary.pending, (state) => {
        state.summary.status = "loading";
      })
      .addCase(fetchBlogSummary.fulfilled, (state, action) => {
        state.summary.status = "succeeded";
        state.summary.data = { ...EMPTY_SUMMARY, ...action.payload.data };
      })
      .addCase(fetchBlogSummary.rejected, (state) => {
        state.summary.status = "failed";
      })

      .addCase(fetchBlogCategoryOptions.pending, (state) => {
        state.categories.status = "loading";
      })
      .addCase(fetchBlogCategoryOptions.fulfilled, (state, action) => {
        state.categories.status = "succeeded";
        state.categories.items = action.payload;
      })
      .addCase(fetchBlogCategoryOptions.rejected, (state) => {
        state.categories.status = "failed";
      })

      // Patch the row in place so a toggle shows instantly; the page still
      // refetches afterwards to keep filters and counts exact. Only the
      // flags are merged - the response carries the whole content too.
      .addCase(updateBlogFlags.fulfilled, (state, action) => {
        const updated = action.payload.data;
        const row = state.items.find((item) => item._id === updated?._id);
        if (row) {
          row.status = updated.status;
          row.isPublished = updated.isPublished;
          row.isPopular = updated.isPopular;
          row.isTrendy = updated.isTrendy;
        }
      })
      .addCase(deleteBlog.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload.id);
      });
  },
});

export default blogSlice.reducer;
