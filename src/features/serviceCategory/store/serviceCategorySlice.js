// Feature-owned Redux state for Service Category Management (Super Admin and
// Admin). Every service category API call goes through a createAsyncThunk
// here - no component calls httpClient directly. Errors are already toasted
// globally by httpClient.
//
// Each thunk picks its base path from the logged-in role
// (getState().auth.role, same approach as providerSlice.js): a Super Admin
// calls /super-admin/api/v1/service-categories, an Admin
// /admin/api/v1/service-categories - where the backend limits them to the
// categories of their own vertical.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/httpClient.js";
import {
  SERVICE_CATEGORY_API_PATHS,
  SERVICE_CATEGORY_FETCH_SIZE,
  SERVICE_CATEGORY_ICON_FIELD,
} from "../definitions/serviceCategories.js";

const initialState = {
  items: [],
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' - the listing's status
  error: null,
};

const apiPath = (getState) => SERVICE_CATEGORY_API_PATHS[getState().auth.role];

const fail = (error, rejectWithValue) => rejectWithValue(error.response?.data);

// Create and update are multipart requests: the text fields plus, when one
// was picked, the icon file under the field name the backend's uploader reads.
const toFormData = ({ iconFile, ...fields }) => {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value);
  });
  if (iconFile) formData.append(SERVICE_CATEGORY_ICON_FIELD, iconFile);
  return formData;
};

// -> service_category.controller.js getAllServiceCategories (GET, paginated,
// newest first; each row carries vertical_data { _id, name, display_name }).
// The endpoint has no search or status filter and no summary counts, so this
// loads every page and the listing searches, filters, counts and pages in the
// browser - a category catalogue is small.
export const fetchServiceCategories = createAsyncThunk(
  "serviceCategory/fetchServiceCategories",
  async (_, { getState, rejectWithValue }) => {
    try {
      const items = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await getJson(`${apiPath(getState)}?page=${page}&per_page=${SERVICE_CATEGORY_FETCH_SIZE}`);
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

// -> createServiceCategory (POST, multipart). payload: { name, description?,
// iconFile? } plus vertical_id for the Super Admin - an Admin's category
// always lands in their own vertical. No status is sent, so the backend
// creates it Active.
export const createServiceCategory = createAsyncThunk(
  "serviceCategory/createServiceCategory",
  async (payload, { getState, rejectWithValue }) => {
    try {
      return await postJson(apiPath(getState), toFormData(payload));
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> updateServiceCategory (PATCH /:id, multipart). payload: at least one of
// { name, description, vertical_id, iconFile }.
export const updateServiceCategory = createAsyncThunk(
  "serviceCategory/updateServiceCategory",
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      return await patchJson(`${apiPath(getState)}/${id}`, toFormData(payload));
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> changeServiceCategoryStatus (PATCH /status/:id). status: "Active" | "Inactive".
export const updateServiceCategoryStatus = createAsyncThunk(
  "serviceCategory/updateServiceCategoryStatus",
  async ({ id, status }, { getState, rejectWithValue }) => {
    try {
      return await patchJson(`${apiPath(getState)}/status/${id}`, { status });
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> deleteServiceCategory (DELETE /remove/:id). A soft delete that the
// backend refuses (409) while any service is assigned to the category - that
// message is toasted globally by httpClient. Responds with a message only.
export const deleteServiceCategory = createAsyncThunk(
  "serviceCategory/deleteServiceCategory",
  async (id, { getState, rejectWithValue }) => {
    try {
      const response = await deleteJson(`${apiPath(getState)}/remove/${id}`);
      return { ...response, id };
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// Merge an updated category into its row, if it's there. The update endpoints
// return the bare document without vertical_data, so the row's own is kept.
const mergeRow = (state, action) => {
  const updated = action.payload.data;
  const index = state.items.findIndex((item) => item._id === updated?._id);
  if (index !== -1) state.items[index] = { ...state.items[index], ...updated };
};

const serviceCategorySlice = createSlice({
  name: "serviceCategory",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchServiceCategories.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchServiceCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchServiceCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      // Patch rows in place so the UI updates instantly; the page still
      // refetches afterwards to keep counts, ordering and verticals exact.
      .addCase(updateServiceCategory.fulfilled, mergeRow)
      .addCase(updateServiceCategoryStatus.fulfilled, mergeRow)
      .addCase(deleteServiceCategory.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload.id);
      });
  },
});

export default serviceCategorySlice.reducer;
