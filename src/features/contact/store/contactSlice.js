// Feature-owned Redux state for the Contact inbox (Super Admin and Admin).
// Every contact API call goes through a createAsyncThunk here - no component
// calls httpClient directly. Errors are already toasted globally by httpClient.
//
// The thunk picks its base path from the logged-in role (getState().auth.role,
// same approach as serviceCategorySlice.js).
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson } from "@/lib/httpClient.js";
import { CONTACT_API_PATHS, CONTACT_FETCH_SIZE, CONTACT_NOTIFICATION_LIMIT } from "../definitions/contacts.js";

const initialState = {
  items: [],
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' - the listing's status
  error: null,
  // When the inbox was last loaded - the "now" that relative times ("2h ago")
  // and the Received filter are measured from.
  fetchedAt: null,
  // The newest few messages, for the Topbar bell. Kept apart from `items` so
  // the bell works on every page without loading the whole inbox.
  notifications: { items: [], status: "idle" },
};

// -> contact.controller.js getAllContacts (GET, paginated, newest first). Each
// row is the whole message { _id, fullName, email, subject, message,
// senderType, user_id, createdAt } - user_id being the sender's account for a
// registered sender - so the details dialog needs no second request. The endpoint has
// no search or date filter and no summary counts, so this loads every page and
// the listing searches, filters, counts and pages in the browser.
export const fetchContacts = createAsyncThunk(
  "contact/fetchContacts",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiPath = CONTACT_API_PATHS[getState().auth.role];
      const items = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await getJson(`${apiPath}?page=${page}&per_page=${CONTACT_FETCH_SIZE}`);
        items.push(...(response.data ?? []));
        totalPages = response.meta?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages);
      return { items, fetchedAt: Date.now() };
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

// -> the same getAllContacts, first page only: one message more than the bell
// lists, which is enough to tell "5" from "5+". It runs on a timer in the
// background, so it opts out of httpClient's global error toast - a dropped
// connection must not raise a toast every minute.
export const fetchContactNotifications = createAsyncThunk(
  "contact/fetchContactNotifications",
  async (_, { getState, rejectWithValue }) => {
    try {
      const apiPath = CONTACT_API_PATHS[getState().auth.role];
      const response = await getJson(`${apiPath}?page=1&per_page=${CONTACT_NOTIFICATION_LIMIT + 1}`, {
        skipGlobalErrorHandler: true,
      });
      return response.data ?? [];
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
  {
    condition: (_, { getState }) => {
      const status = getState().contact?.notifications?.status;
      return status !== "loading";
    },
  },
);

const contactSlice = createSlice({
  name: "contact",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items;
        state.fetchedAt = action.payload.fetchedAt;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      // Only the very first check counts as "loading" - later ones run quietly
      // in the background, and a failed one keeps the messages already shown.
      .addCase(fetchContactNotifications.pending, (state) => {
        if (state.notifications.status === "idle") state.notifications.status = "loading";
      })
      .addCase(fetchContactNotifications.fulfilled, (state, action) => {
        state.notifications = { items: action.payload, status: "succeeded" };
      })
      .addCase(fetchContactNotifications.rejected, (state) => {
        state.notifications.status = "failed";
      });
  },
});

export default contactSlice.reducer;
