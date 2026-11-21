// Feature-owned Redux state for Team Management (Super Admin only). Every
// team member API call goes through a createAsyncThunk here - no component
// calls httpClient directly. Errors are already toasted globally by
// httpClient.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/httpClient.js";
import {
  TEAM_MEMBER_API_PATH,
  TEAM_MEMBER_FETCH_SIZE,
  TEAM_MEMBER_AVATAR_FIELD,
} from "../definitions/teamMembers.js";

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
  if (avatarFile) formData.append(TEAM_MEMBER_AVATAR_FIELD, avatarFile);
  return formData;
};

// -> team_management.controller.js getAllTeamMembers (GET). Every member in
// display order (`order`, then oldest first), loaded page by page.
export const fetchTeamMembers = createAsyncThunk("teamMember/fetchTeamMembers", async (_, { rejectWithValue }) => {
  try {
    const items = [];
    let page = 1;
    let totalPages = 1;
    do {
      const params = new URLSearchParams({
        sort: "order_asc",
        page: String(page),
        per_page: String(TEAM_MEMBER_FETCH_SIZE),
      });
      const response = await getJson(`${TEAM_MEMBER_API_PATH}?${params}`);
      items.push(...(response.data ?? []));
      totalPages = response.meta?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);
    return items;
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> createTeamMember (POST, multipart). payload: { name, designation,
// linkedin?, order, status, avatarFile? }.
export const createTeamMember = createAsyncThunk(
  "teamMember/createTeamMember",
  async (payload, { rejectWithValue }) => {
    try {
      return await postJson(TEAM_MEMBER_API_PATH, toFormData(payload));
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> updateTeamMember (PATCH /:id, multipart). payload: at least one of
// { name, designation, linkedin, status, avatar: "", avatarFile }.
export const updateTeamMember = createAsyncThunk(
  "teamMember/updateTeamMember",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await patchJson(`${TEAM_MEMBER_API_PATH}/${id}`, toFormData(payload));
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> changeTeamMemberStatus (PATCH /status/:id). status: "Active" | "Inactive".
export const updateTeamMemberStatus = createAsyncThunk(
  "teamMember/updateTeamMemberStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      return await patchJson(`${TEAM_MEMBER_API_PATH}/status/${id}`, { status });
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// -> deleteTeamMember (DELETE /remove/:id). A soft delete; responds with a message only.
export const deleteTeamMember = createAsyncThunk(
  "teamMember/deleteTeamMember",
  async ({ id }, { rejectWithValue }) => {
    try {
      const response = await deleteJson(`${TEAM_MEMBER_API_PATH}/remove/${id}`);
      return { ...response, id };
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// Saves a new display order: `items` is every member in its new order. Only
// those whose position changed are PATCHed, each to `order: <1-based
// position>`. The list is reordered right away (pending) so the move feels
// instant; if a request fails the page reloads the list.
export const reorderTeamMembers = createAsyncThunk(
  "teamMember/reorderTeamMembers",
  async ({ items }, { rejectWithValue }) => {
    try {
      const changed = items
        .map((member, index) => ({ member, order: index + 1 }))
        .filter(({ member, order }) => member.order !== order);
      await Promise.all(
        changed.map(({ member, order }) => patchJson(`${TEAM_MEMBER_API_PATH}/${member._id}`, { order })),
      );
      return changed.length;
    } catch (error) {
      return fail(error, rejectWithValue);
    }
  },
);

// Merge an updated member into its row.
const mergeRow = (state, action) => {
  const updated = action.payload.data;
  const index = state.items.findIndex((item) => item._id === updated?._id);
  if (index !== -1) state.items[index] = updated;
};

const teamMemberSlice = createSlice({
  name: "teamMember",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeamMembers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      .addCase(createTeamMember.fulfilled, (state, action) => {
        if (action.payload.data) state.items.push(action.payload.data);
      })
      .addCase(updateTeamMember.fulfilled, mergeRow)
      .addCase(updateTeamMemberStatus.fulfilled, mergeRow)
      .addCase(deleteTeamMember.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload.id);
      })

      .addCase(reorderTeamMembers.pending, (state, action) => {
        state.items = action.meta.arg.items.map((member, index) => ({ ...member, order: index + 1 }));
      });
  },
});

export default teamMemberSlice.reducer;
