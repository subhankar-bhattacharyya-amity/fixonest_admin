// Feature-owned Redux state for Service Management (Super Admin and Admin).
// Every service API call goes through a createAsyncThunk here - no component
// calls httpClient directly. Errors are already toasted globally by httpClient.
//
// Each thunk picks its base path from the logged-in role
// (getState().auth.role, same approach as blogSlice.js): a Super Admin calls
// /super-admin/api/v1/services, an Admin /admin/api/v1/services.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/httpClient.js";
import {
  SERVICE_API_PATHS,
  SERVICE_CATEGORY_OPTION_API_PATHS,
  SERVICE_CATEGORY_OPTION_FETCH_SIZE,
  SERVICES_PER_PAGE,
  SERVICE_COVER_FIELD,
  SERVICE_GALLERY_FIELD,
  SERVICE_SINGLE_IMAGE_FIELD,
  SERVICE_LIST_FIELDS,
  SERVICE_FEATURED_LIMIT,
} from "../definitions/services.js";

// featured counts the viewer's own services (an Admin: their vertical);
// featuredInUse counts every vertical - the featured limit is shared.
const EMPTY_SUMMARY = { total: 0, active: 0, inactive: 0, featured: 0, featuredInUse: 0, featuredLimit: SERVICE_FEATURED_LIMIT };

const initialState = {
  items: [],
  meta: { page: 1, perPage: SERVICES_PER_PAGE, total: 0, totalPages: 0 },
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' - the listing's status
  error: null,
  summary: { data: EMPTY_SUMMARY, status: "idle" },
  // Every service category the viewer may use, for the filter and the editor.
  categories: { items: [], status: "idle" },
};

const apiPath = (getState) => SERVICE_API_PATHS[getState().auth.role];

const fail = (error, rejectWithValue) => rejectWithValue(error.response?.data);

// Multipart body: scalars as-is, list fields as repeated "field[]" parts. An
// empty list is sent as field="" - multipart can't carry an empty array, and
// the backend reads "" as "clear the list".
const toFormData = (fields, files = {}) => {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (SERVICE_LIST_FIELDS.includes(key)) {
      if (value.length === 0) formData.append(key, "");
      else value.forEach((item) => formData.append(`${key}[]`, item));
    } else {
      formData.append(key, value);
    }
  });
  if (files.cover) formData.append(SERVICE_COVER_FIELD, files.cover);
  (files.gallery ?? []).forEach((file) => formData.append(SERVICE_GALLERY_FIELD, file));
  return formData;
};

// -> service.controller.js getAllServices (GET, paginated). Rows carry
// category_data { _id, name, slug, icon_url } and vertical_data, but not the
// details or gallery. Filters: search, status, categoryId, featuredOnly, sort.
export const fetchServices = createAsyncThunk(
  "service/fetchServices",
  async (
    { page = 1, perPage = SERVICES_PER_PAGE, search, status, categoryId, featuredOnly, sort } = {},
    { getState, rejectWithValue },
  ) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (search?.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (categoryId) params.set("categoryId", categoryId);
    if (featuredOnly) params.set("isFeatured", "true");
    if (sort) params.set("sort", sort);
    try {
      return await getJson(`${apiPath(getState)}?${params}`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> getServiceSummary (GET /summary). { total, active, inactive, featured, featuredLimit }.
export const fetchServiceSummary = createAsyncThunk(
  "service/fetchServiceSummary",
  async (_, { getState, rejectWithValue }) => {
    try {
      return await getJson(`${apiPath(getState)}/summary`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> getServiceById (GET /:id). The full service: details
// { overview, whatYouGet, packageBenefits, durationLabel, skills } and
// images [{ _id, image_url, sortOrder }].
export const fetchServiceById = createAsyncThunk(
  "service/fetchServiceById",
  async (id, { getState, rejectWithValue }) => {
    try {
      return await getJson(`${apiPath(getState)}/${id}`);
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> service_category.controller.js getAllServiceCategories, every page of it.
export const fetchServiceCategoryOptions = createAsyncThunk(
  "service/fetchServiceCategoryOptions",
  async (_, { getState, rejectWithValue }) => {
    const path = SERVICE_CATEGORY_OPTION_API_PATHS[getState().auth.role];
    try {
      const items = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await getJson(`${path}?page=${page}&per_page=${SERVICE_CATEGORY_OPTION_FETCH_SIZE}`);
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

// -> createService (POST, multipart). payload: every form field (service and
// details fields together - the backend splits them), plus coverFile? and
// galleryFiles (in gallery order).
export const createService = createAsyncThunk(
  "service/createService",
  async ({ coverFile, galleryFiles = [], ...fields }, { getState, rejectWithValue }) => {
    try {
      return await postJson(apiPath(getState), toFormData(fields, { cover: coverFile, gallery: galleryFiles }));
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// Saves an edited service, one call after another, stopping at the first
// that fails:
//   1. changes / coverFile -> updateService (PATCH /:id). JSON, or multipart
//      when a new cover was picked. image_url: "" removes the cover.
//   2. removedImageIds     -> removeServiceImage (DELETE /:id/images/:imageId).
//   3. newImages           -> addServiceImage (POST /:id/images, one file each).
//   4. galleryOrder        -> reorderServiceImages (PATCH /:id/images/reorder)
//      when the final order differs from the order the server would keep.
//      galleryOrder lists every kept image as { id, isNew } - a new image's id
//      is its newImages key until it has been uploaded.
export const updateService = createAsyncThunk(
  "service/updateService",
  async (
    { id, changes = {}, coverFile, removedImageIds = [], newImages = [], galleryOrder = [] },
    { getState, rejectWithValue },
  ) => {
    const path = `${apiPath(getState)}/${id}`;
    try {
      let response = { message: "Service updated successfully" };
      if (coverFile) {
        response = await patchJson(path, toFormData(changes, { cover: coverFile }));
      } else if (Object.keys(changes).length > 0) {
        response = await patchJson(path, changes);
      }

      for (const imageId of removedImageIds) {
        await deleteJson(`${path}/images/${imageId}`);
      }

      const uploadedIds = {};
      for (const image of newImages) {
        const formData = new FormData();
        formData.append(SERVICE_SINGLE_IMAGE_FIELD, image.file);
        const created = await postJson(`${path}/images`, formData);
        uploadedIds[image.id] = created.data?._id;
      }

      const finalOrder = galleryOrder.map((image) => (image.isNew ? uploadedIds[image.id] : image.id)).filter(Boolean);
      // Without a reorder the server keeps the saved images in their order and
      // appends the uploads in upload order.
      const naturalOrder = [
        ...galleryOrder.filter((image) => !image.isNew).map((image) => image.id),
        ...newImages.map((image) => uploadedIds[image.id]),
      ];
      if (finalOrder.length > 1 && finalOrder.some((imageId, index) => imageId !== naturalOrder[index])) {
        await patchJson(`${path}/images/reorder`, { imageIds: finalOrder });
      }

      return response;
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> changeServiceStatus (PATCH /status/:id). status: "Active" | "Inactive".
export const updateServiceStatus = createAsyncThunk(
  "service/updateServiceStatus",
  async ({ id, status }, { getState, rejectWithValue }) => {
    try {
      return await patchJson(`${apiPath(getState)}/status/${id}`, { status });
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> toggleFeatured (PATCH /featured/:id). The row flips at once (pending) and
// flips back if the backend refuses - e.g. a 7th featured service (400,
// toasted globally by httpClient).
export const toggleServiceFeatured = createAsyncThunk(
  "service/toggleServiceFeatured",
  async ({ id, isFeatured }, { getState, rejectWithValue }) => {
    try {
      return await patchJson(`${apiPath(getState)}/featured/${id}`, { isFeatured });
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> deleteService (DELETE /remove/:id). A soft delete; responds with a message only.
export const deleteService = createAsyncThunk("service/deleteService", async (id, { getState, rejectWithValue }) => {
  try {
    const response = await deleteJson(`${apiPath(getState)}/remove/${id}`);
    return { ...response, id };
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

const setRowFeatured = (state, id, isFeatured) => {
  const row = state.items.find((item) => item._id === id);
  if (row) row.isFeatured = isFeatured;
};

const serviceSlice = createSlice({
  name: "service",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchServices.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.data ?? [];
        state.meta = action.payload.meta ?? initialState.meta;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      .addCase(fetchServiceSummary.pending, (state) => {
        state.summary.status = "loading";
      })
      .addCase(fetchServiceSummary.fulfilled, (state, action) => {
        state.summary.status = "succeeded";
        state.summary.data = { ...EMPTY_SUMMARY, ...action.payload.data };
      })
      .addCase(fetchServiceSummary.rejected, (state) => {
        state.summary.status = "failed";
      })

      .addCase(fetchServiceCategoryOptions.pending, (state) => {
        state.categories.status = "loading";
      })
      .addCase(fetchServiceCategoryOptions.fulfilled, (state, action) => {
        state.categories.status = "succeeded";
        state.categories.items = action.payload;
      })
      .addCase(fetchServiceCategoryOptions.rejected, (state) => {
        state.categories.status = "failed";
      })

      // Optimistic featured toggle, with the summary's count kept in step.
      .addCase(toggleServiceFeatured.pending, (state, action) => {
        const { id, isFeatured } = action.meta.arg;
        setRowFeatured(state, id, isFeatured);
        const step = isFeatured ? 1 : -1;
        state.summary.data.featured = Math.max(0, state.summary.data.featured + step);
        state.summary.data.featuredInUse = Math.max(0, state.summary.data.featuredInUse + step);
      })
      .addCase(toggleServiceFeatured.rejected, (state, action) => {
        const { id, isFeatured } = action.meta.arg;
        setRowFeatured(state, id, !isFeatured);
        const step = isFeatured ? -1 : 1;
        state.summary.data.featured = Math.max(0, state.summary.data.featured + step);
        state.summary.data.featuredInUse = Math.max(0, state.summary.data.featuredInUse + step);
      })

      .addCase(updateServiceStatus.fulfilled, (state, action) => {
        const updated = action.payload.data;
        const row = state.items.find((item) => item._id === updated?._id);
        if (row) row.status = updated.status;
      })
      .addCase(deleteService.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload.id);
      });
  },
});

export default serviceSlice.reducer;
