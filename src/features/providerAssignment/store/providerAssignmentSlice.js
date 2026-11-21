// Feature-owned Redux state for "Assignment Management > Provider" (Super
// Admin and Admin). Every provider-assignment API call goes through a
// createAsyncThunk here - no component calls httpClient directly. Errors are
// already toasted globally by httpClient.
//
// Each thunk picks its base path from the logged-in role
// (getState().auth.role, same approach as providerSlice.js): a Super Admin
// calls /super-admin/api/..., an Admin /admin/api/...
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/httpClient.js";
import { PROVIDER_API_PATHS } from "@/features/provider/index.js";
import { SERVICE_CATEGORY_API_PATHS } from "@/features/serviceCategory/index.js";
import { PROVIDER_ASSIGNMENT_API_PATHS, ASSIGNMENT_FETCH_SIZE } from "../definitions/providerAssignments.js";

const initialState = {
  providers: [],
  categories: [],
  assignments: [],
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const apiPath = (getState) => PROVIDER_ASSIGNMENT_API_PATHS[getState().auth.role];

const fail = (error, rejectWithValue) => rejectWithValue(error.response?.data);

// Walks a paginated listing to the end and returns every row.
const fetchAllPages = async (path) => {
  const items = [];
  let page = 1;
  let totalPages;
  do {
    const response = await getJson(`${path}?page=${page}&per_page=${ASSIGNMENT_FETCH_SIZE}`);
    items.push(...(response.data ?? []));
    totalPages = response.meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);
  return items;
};

// Everything the page shows, in one go: the providers this role can see
// (providers.controller.js getAllProviders), its service categories
// (service_category.controller.js getAllServiceCategories) and every
// assignment (provider_assignment.controller.js getAllAssignments - each row
// has user_id, category_id and assign_by populated). The assignment list has
// no search or per-category filter, so the page joins, searches, filters and
// pages these in the browser - same approach as serviceCategorySlice.js.
export const fetchAssignmentBoard = createAsyncThunk(
  "providerAssignment/fetchAssignmentBoard",
  async (_, { getState, rejectWithValue }) => {
    const { role } = getState().auth;
    try {
      const [providers, categories, assignments] = await Promise.all([
        fetchAllPages(PROVIDER_API_PATHS[role]),
        fetchAllPages(SERVICE_CATEGORY_API_PATHS[role]),
        fetchAllPages(PROVIDER_ASSIGNMENT_API_PATHS[role]),
      ]);
      return { providers, categories, assignments };
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// Applies one provider's category changes: POST for each category to add
// (assignProviderAdmin - body { user_id, category_id }) and DELETE /:id for
// each assignment to remove (removeAssignmentAdmin). The API handles one
// assignment per request, so they run side by side and the result reports how
// many of each went through; it only rejects when nothing did.
export const saveProviderAssignments = createAsyncThunk(
  "providerAssignment/saveProviderAssignments",
  async ({ providerId, addCategoryIds = [], removeAssignmentIds = [] }, { getState, rejectWithValue }) => {
    const path = apiPath(getState);
    const results = await Promise.allSettled([
      ...addCategoryIds.map((categoryId) => postJson(path, { user_id: providerId, category_id: categoryId })),
      ...removeAssignmentIds.map((assignmentId) => deleteJson(`${path}/${assignmentId}`)),
    ]);

    const succeeded = (settled) => settled.filter((result) => result.status === "fulfilled").length;
    const added = succeeded(results.slice(0, addCategoryIds.length));
    const removed = succeeded(results.slice(addCategoryIds.length));
    const failed = results.length - added - removed;

    if (added + removed === 0) return rejectWithValue({ failed });
    return { added, removed, failed };
  },
);

// -> removeAssignmentAdmin (DELETE /:id). Responds with a message only.
export const removeProviderAssignment = createAsyncThunk(
  "providerAssignment/removeProviderAssignment",
  async (assignmentId, { getState, rejectWithValue }) => {
    try {
      const response = await deleteJson(`${apiPath(getState)}/${assignmentId}`);
      return { ...response, id: assignmentId };
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> updateAssignmentStatus / acceptAssignment / rejectAssignment (PATCH /:id/approve or /:id/reject)
export const updateProviderAssignmentStatus = createAsyncThunk(
  "providerAssignment/updateProviderAssignmentStatus",
  async ({ assignmentId, status }, { getState, rejectWithValue }) => {
    try {
      const endpoint = status === "Approved" ? "approve" : "reject";
      const response = await patchJson(`${apiPath(getState)}/${assignmentId}/${endpoint}`, { status });
      return { ...response, id: assignmentId, status };
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

const providerAssignmentSlice = createSlice({
  name: "providerAssignment",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssignmentBoard.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAssignmentBoard.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.providers = action.payload.providers;
        state.categories = action.payload.categories;
        state.assignments = action.payload.assignments;
      })
      .addCase(fetchAssignmentBoard.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      // Drop the row at once so the chip disappears instantly; the page still
      // refetches afterwards to keep every count exact.
      .addCase(removeProviderAssignment.fulfilled, (state, action) => {
        state.assignments = state.assignments.filter((item) => item._id !== action.payload.id);
      })

      // Optimistically update status on fulfilled
      .addCase(updateProviderAssignmentStatus.fulfilled, (state, action) => {
        const assignment = state.assignments.find((item) => item._id === action.payload.id);
        if (assignment) {
          assignment.status = action.payload.status;
          if (action.payload.data?.statusChangedBy) {
            assignment.statusChangedBy = action.payload.data.statusChangedBy;
          }
        }
      });
  },
});

export default providerAssignmentSlice.reducer;
