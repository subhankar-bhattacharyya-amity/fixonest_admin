// Feature-owned Redux state for Vertical Admin management (Super Admin only).
// Every vertical-admin API call goes through a createAsyncThunk here - no
// component calls httpClient directly. Errors are already toasted globally by
// httpClient.
//
// Two independent reads:
//   - `items`/`meta`  -> the filtered, paginated table.
//   - `overview`      -> every live admin (unfiltered, all pages), powering
//                        the stat cards and the vertical coverage
//                        board, so those numbers never depend on the table's
//                        current page or filters.
//
// There is deliberately no "fetch one" thunk: the backend's details endpoint
// is a GET that reads its id from the request body, which browsers never
// send. The listing already returns full rows (vertical populated), so the
// edit modal works from the row instead.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, postJson, putJson, patchJson, deleteJson } from "@/lib/httpClient.js";
import {
  VERTICAL_ADMIN_API_PATH,
  VERTICAL_ADMINS_PER_PAGE,
  VERTICAL_ADMIN_OVERVIEW_LIMIT,
} from "../definitions/verticalAdmins.js";

const initialState = {
  items: [],
  meta: { page: 1, perPage: VERTICAL_ADMINS_PER_PAGE, total: 0, totalPages: 0 },
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' - the table's status
  error: null,
  overview: { items: [], status: "idle" },
};

const buildListQuery = ({ page, perPage, search, verticalId, accountStatus }) => {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (search?.trim()) params.set("search", search.trim());
  if (verticalId) params.set("vertical_id", verticalId);
  if (accountStatus) params.set("accountStatus", accountStatus);
  return `${VERTICAL_ADMIN_API_PATH}?${params}`;
};

// -> vertical_admin.controller.js getAllAdmins (GET, paginated). Optional
// filters: search (name/email/phone), verticalId, accountStatus.
export const fetchVerticalAdmins = createAsyncThunk(
  "verticalAdmin/fetchVerticalAdmins",
  async ({ page = 1, perPage = VERTICAL_ADMINS_PER_PAGE, search, verticalId, accountStatus } = {}, { rejectWithValue }) => {
    try {
      return await getJson(buildListQuery({ page, perPage, search, verticalId, accountStatus }));
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

// Same endpoint, unfiltered, walking every page (at the backend's max page
// size) so the overview holds all live admins - see the overview note above.
// Resolves to { data: [...all admins] }.
export const fetchVerticalAdminOverview = createAsyncThunk(
  "verticalAdmin/fetchVerticalAdminOverview",
  async (_, { rejectWithValue }) => {
    try {
      const perPage = VERTICAL_ADMIN_OVERVIEW_LIMIT;
      const first = await getJson(buildListQuery({ page: 1, perPage }));
      const totalPages = first.meta?.totalPages ?? 1;
      const rest = await Promise.all(
        Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) =>
          getJson(buildListQuery({ page: index + 2, perPage })),
        ),
      );
      return { data: [first, ...rest].flatMap((response) => response.data ?? []) };
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

// -> createAdmin (POST). payload: { fullName, email, phone, vertical_id, password }
// - vertical_id assigns the new admin to that vertical; password is the
// sign-in password the Super Admin chose.
export const createVerticalAdmin = createAsyncThunk(
  "verticalAdmin/createVerticalAdmin",
  async (payload, { rejectWithValue }) => {
    try {
      return await postJson(VERTICAL_ADMIN_API_PATH, payload);
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

// -> updateAdmin (PUT, id in body). payload: at least one of
// { fullName, email, phone, vertical_id }.
export const updateVerticalAdmin = createAsyncThunk(
  "verticalAdmin/updateVerticalAdmin",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await putJson(VERTICAL_ADMIN_API_PATH, { id, ...payload });
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

// -> updateAdminStatus (PATCH /status, id in body). accountStatus: "active" | "suspended".
export const updateVerticalAdminStatus = createAsyncThunk(
  "verticalAdmin/updateVerticalAdminStatus",
  async ({ id, accountStatus }, { rejectWithValue }) => {
    try {
      return await patchJson(`${VERTICAL_ADMIN_API_PATH}/status`, { id, accountStatus });
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

// -> deleteAdmin (DELETE, id in body). A soft delete: the backend deactivates
// the account. Responds with a message only.
export const deleteVerticalAdmin = createAsyncThunk(
  "verticalAdmin/deleteVerticalAdmin",
  async (id, { rejectWithValue }) => {
    try {
      const response = await deleteJson(VERTICAL_ADMIN_API_PATH, { data: { id } });
      return { ...response, id };
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

// Swap an updated admin into a list in place, if it's there.
const replaceAdmin = (list, updated) => {
  const index = list.findIndex((item) => item._id === updated?._id);
  if (index !== -1) list[index] = updated;
};

const verticalAdminSlice = createSlice({
  name: "verticalAdmin",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVerticalAdmins.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchVerticalAdmins.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.data ?? [];
        state.meta = action.payload.meta ?? initialState.meta;
      })
      .addCase(fetchVerticalAdmins.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      .addCase(fetchVerticalAdminOverview.pending, (state) => {
        state.overview.status = "loading";
      })
      .addCase(fetchVerticalAdminOverview.fulfilled, (state, action) => {
        state.overview.status = "succeeded";
        state.overview.items = action.payload.data ?? [];
      })
      .addCase(fetchVerticalAdminOverview.rejected, (state) => {
        state.overview.status = "failed";
      })

      // Patch rows in place so the UI updates instantly; the page still
      // refetches afterwards to keep counts, filters and ordering exact.
      .addCase(updateVerticalAdmin.fulfilled, (state, action) => {
        replaceAdmin(state.items, action.payload.data);
        replaceAdmin(state.overview.items, action.payload.data);
      })
      .addCase(updateVerticalAdminStatus.fulfilled, (state, action) => {
        replaceAdmin(state.items, action.payload.data);
        replaceAdmin(state.overview.items, action.payload.data);
      })
      .addCase(deleteVerticalAdmin.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload.id);
        state.overview.items = state.overview.items.filter((item) => item._id !== action.payload.id);
      });
  },
});

export default verticalAdminSlice.reducer;
