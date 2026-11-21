// Feature-owned Redux state for FAQ Management (Super Admin only). Every FAQ
// API call goes through a createAsyncThunk here - no component calls
// httpClient directly. Errors are already toasted globally by httpClient.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/httpClient.js";
import { FAQ_API_PATH, FAQ_FETCH_SIZE } from "../definitions/faqs.js";

// One entry per section (keyed by its backend `category`), so switching tabs
// doesn't throw away what another tab already loaded.
const EMPTY_SECTION = { items: [], status: "idle", error: null }; // status: 'idle' | 'loading' | 'succeeded' | 'failed'

const initialState = { sections: {} };

const fail = (error, rejectWithValue) => rejectWithValue(error.response?.data);

const sectionOf = (state, category) => {
  if (!state.sections[category]) state.sections[category] = { ...EMPTY_SECTION };
  return state.sections[category];
};

// The section the FAQ in an action's response belongs to, or null.
const sectionOfFaq = (state, faq) => (faq?.category ? state.sections[faq.category] : null);

// -> faq.controller.js getAllFaqs (GET). Every FAQ of one section, in display
// order (`order`, then newest first), loaded page by page.
export const fetchFaqs = createAsyncThunk("faq/fetchFaqs", async (category, { rejectWithValue }) => {
  try {
    const items = [];
    let page = 1;
    let totalPages = 1;
    do {
      const params = new URLSearchParams({
        category,
        sort: "order_asc",
        page: String(page),
        per_page: String(FAQ_FETCH_SIZE),
      });
      const response = await getJson(`${FAQ_API_PATH}?${params}`);
      items.push(...(response.data ?? []));
      totalPages = response.meta?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);
    return items;
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> createFaq (POST). payload: { question, answer, category, order, status }.
export const createFaq = createAsyncThunk("faq/createFaq", async (payload, { rejectWithValue }) => {
  try {
    return await postJson(FAQ_API_PATH, payload);
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> updateFaq (PATCH /:id). payload: at least one of
// { question, answer, category, order, status }.
export const updateFaq = createAsyncThunk("faq/updateFaq", async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await patchJson(`${FAQ_API_PATH}/${id}`, payload);
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> changeFaqStatus (PATCH /status/:id). status: "Active" | "Inactive".
export const updateFaqStatus = createAsyncThunk("faq/updateFaqStatus", async ({ id, status }, { rejectWithValue }) => {
  try {
    return await patchJson(`${FAQ_API_PATH}/status/${id}`, { status });
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// -> deleteFaq (DELETE /remove/:id). A soft delete; responds with a message only.
export const deleteFaq = createAsyncThunk("faq/deleteFaq", async ({ id, category }, { rejectWithValue }) => {
  try {
    const response = await deleteJson(`${FAQ_API_PATH}/remove/${id}`);
    return { ...response, id, category };
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// Saves a new display order for a section: `items` is the section's FAQs in
// their new order. Only the FAQs whose position changed are PATCHed, each to
// `order: <1-based position>`. The list is reordered right away (pending) so
// the move feels instant; if a request fails the page reloads the section.
export const reorderFaqs = createAsyncThunk("faq/reorderFaqs", async ({ items }, { rejectWithValue }) => {
  try {
    const changed = items
      .map((faq, index) => ({ faq, order: index + 1 }))
      .filter(({ faq, order }) => faq.order !== order);
    await Promise.all(changed.map(({ faq, order }) => patchJson(`${FAQ_API_PATH}/${faq._id}`, { order })));
    return changed.length;
  } catch (error) {
    return fail(error, rejectWithValue);
  }
});

// Merge an updated FAQ into its row.
const mergeRow = (state, action) => {
  const updated = action.payload.data;
  const section = sectionOfFaq(state, updated);
  if (!section) return;
  const index = section.items.findIndex((item) => item._id === updated._id);
  if (index !== -1) section.items[index] = updated;
};

const faqSlice = createSlice({
  name: "faq",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFaqs.pending, (state, action) => {
        const section = sectionOf(state, action.meta.arg);
        section.status = "loading";
        section.error = null;
      })
      .addCase(fetchFaqs.fulfilled, (state, action) => {
        const section = sectionOf(state, action.meta.arg);
        section.status = "succeeded";
        section.items = action.payload;
      })
      .addCase(fetchFaqs.rejected, (state, action) => {
        const section = sectionOf(state, action.meta.arg);
        section.status = "failed";
        section.error = action.payload?.message || action.error.message;
      })

      .addCase(createFaq.fulfilled, (state, action) => {
        const created = action.payload.data;
        const section = sectionOfFaq(state, created);
        if (section) section.items.push(created);
      })
      .addCase(updateFaq.fulfilled, mergeRow)
      .addCase(updateFaqStatus.fulfilled, mergeRow)
      .addCase(deleteFaq.fulfilled, (state, action) => {
        const section = state.sections[action.payload.category];
        if (section) section.items = section.items.filter((item) => item._id !== action.payload.id);
      })

      .addCase(reorderFaqs.pending, (state, action) => {
        const section = sectionOf(state, action.meta.arg.category);
        section.items = action.meta.arg.items.map((faq, index) => ({ ...faq, order: index + 1 }));
      });
  },
});

export default faqSlice.reducer;
