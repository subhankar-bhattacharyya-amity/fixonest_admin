// Feature-owned Redux state, colocated with the auth feature (same
// convention as fixonest_frontend). Every auth API call goes through a
// createAsyncThunk here - no component calls httpClient directly.
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "sonner";
import { getJson, postJson, patchJson, getErrorMessage } from "@/lib/httpClient.js";
import { appConfig } from "@/lib/config.js";
import { AUTH_BASE_PATHS, LOGIN_ROLE_ORDER } from "../definitions/roles.js";

// A session is all-or-nothing: user, token and role are only restored when
// all three are present. The role decides which dashboard to show and which
// role's /me and /logout to call, so a session without it is unusable
// (e.g. one stored before the role key existed) - clear it instead.
function readStoredSession() {
  try {
    const user = JSON.parse(localStorage.getItem(appConfig.authUserKey));
    const token = localStorage.getItem(appConfig.authTokenKey);
    const role = localStorage.getItem(appConfig.authRoleKey);
    if (user && token && AUTH_BASE_PATHS[role]) return { user, token, role };
  } catch {
    // Corrupt stored user - fall through and clear it.
  }
  clearSession();
  return { user: null, token: null, role: null };
}

function persistSession(user, token, role) {
  localStorage.setItem(appConfig.authUserKey, JSON.stringify(user));
  localStorage.setItem(appConfig.authTokenKey, token);
  localStorage.setItem(appConfig.authRoleKey, role);
}

function clearSession() {
  localStorage.removeItem(appConfig.authUserKey);
  localStorage.removeItem(appConfig.authTokenKey);
  localStorage.removeItem(appConfig.authRoleKey);
}

const initialState = {
  ...readStoredSession(),
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed' - the most recent thunk's status
  error: null,
};

// -> each role's auth controller login (superAdmin/admin/provider.controller.js).
// Tries LOGIN_ROLE_ORDER in turn. The backend answers 401 both for a wrong
// password and for "no account with this role", so a 401 from an earlier
// role means "try the next one"; any other error (403 suspended account or
// unapproved provider, network failure, ...) is final. Earlier attempts opt
// out of httpClient's global toast so an expected 401 is never shown - a
// final error from one of them is toasted here instead. panel is stamped
// here, not collected from the form.
export const loginUser = createAsyncThunk("auth/loginUser", async (credentials, { rejectWithValue }) => {
  const payload = { ...credentials, panel: appConfig.panel };

  for (const [index, role] of LOGIN_ROLE_ORDER.entries()) {
    const isLastAttempt = index === LOGIN_ROLE_ORDER.length - 1;
    try {
      const response = await postJson(`${AUTH_BASE_PATHS[role]}/login`, payload, {
        skipGlobalErrorHandler: !isLastAttempt,
      });
      return { ...response, role };
    } catch (error) {
      if (!isLastAttempt && error.response?.status === 401) continue;
      if (!isLastAttempt) toast.error(getErrorMessage(error));
      return rejectWithValue(error.response?.data);
    }
  }
});

// -> each role's forgot-password endpoint (superAdmin/admin/provider.controller.js).
// No role picker here either, so this tries LOGIN_ROLE_ORDER like loginUser.
// The backend answers 404 when that role has no account with the email, so
// a 404 from an earlier role means "try the next one"; anything else (429
// cooldown, 403 suspended, 502 email failure, ...) is final. Resolves with
// the matched `role`, which the verify and reset steps must reuse.
export const requestPasswordReset = createAsyncThunk(
  "auth/requestPasswordReset",
  async ({ email }, { rejectWithValue }) => {
    for (const [index, role] of LOGIN_ROLE_ORDER.entries()) {
      const isLastAttempt = index === LOGIN_ROLE_ORDER.length - 1;
      try {
        const response = await postJson(`${AUTH_BASE_PATHS[role]}/forgot-password`, { email }, {
          skipGlobalErrorHandler: !isLastAttempt,
        });
        return { ...response, role };
      } catch (error) {
        if (!isLastAttempt && error.response?.status === 404) continue;
        if (!isLastAttempt) toast.error(getErrorMessage(error));
        return rejectWithValue(error.response?.data);
      }
    }
  },
);

// -> the matched role's verify-otp step. Response data carries a one-time
// resetToken (and its expiresAt); the page keeps it in component state only.
export const verifyPasswordResetOtp = createAsyncThunk(
  "auth/verifyPasswordResetOtp",
  async ({ role, email, otp }, { rejectWithValue }) => {
    try {
      return await postJson(`${AUTH_BASE_PATHS[role]}/forgot-password/verify-otp`, { email, otp });
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

// -> the matched role's reset-password step. No token comes back - the user
// logs in afterwards as usual.
export const resetForgottenPassword = createAsyncThunk(
  "auth/resetForgottenPassword",
  async ({ role, email, resetToken, newPassword }, { rejectWithValue }) => {
    try {
      return await postJson(`${AUTH_BASE_PATHS[role]}/reset-password`, { email, resetToken, newPassword });
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

// -> the logged-in role's getProfile ("/me"). Used for session restoration
// on reload (see features/auth/components/AuthBootstrap.jsx).
export const fetchProfile = createAsyncThunk("auth/fetchProfile", async (_, { getState, rejectWithValue }) => {
  try {
    return await getJson(`${AUTH_BASE_PATHS[getState().auth.role]}/me`);
  } catch (error) {
    return rejectWithValue(error.response?.data);
  }
});

// -> the logged-in role's updateProfile (PATCH /profile). Backend accepts a
// partial body (fullName and/or phone); the profile form always sends both.
export const updateProfile = createAsyncThunk("auth/updateProfile", async (payload, { getState, rejectWithValue }) => {
  try {
    return await patchJson(`${AUTH_BASE_PATHS[getState().auth.role]}/profile`, payload);
  } catch (error) {
    return rejectWithValue(error.response?.data);
  }
});

// -> the logged-in role's updateProfilePhoto (POST /profile/photo). payload is
// a FormData with a single "profileImage" file field - postJson detects the
// FormData body and lets the browser set the multipart boundary header.
export const updateProfilePhoto = createAsyncThunk(
  "auth/updateProfilePhoto",
  async (formData, { getState, rejectWithValue }) => {
    try {
      return await postJson(`${AUTH_BASE_PATHS[getState().auth.role]}/profile/photo`, formData);
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  },
);

// -> the logged-in role's changePassword (PATCH /change-password). Response
// carries no user data (only a success message) - the user stays logged in.
export const changePassword = createAsyncThunk("auth/changePassword", async (payload, { getState, rejectWithValue }) => {
  try {
    return await patchJson(`${AUTH_BASE_PATHS[getState().auth.role]}/change-password`, payload);
  } catch (error) {
    return rejectWithValue(error.response?.data);
  }
});

// -> the logged-in role's logout. Revokes the token server-side; the reducer
// below clears the local session on both fulfilled AND rejected, so the user
// is never stuck "logged in" locally just because the revoke call itself
// failed (e.g. the token had already expired).
export const logoutUser = createAsyncThunk("auth/logoutUser", async (_, { getState, rejectWithValue }) => {
  try {
    return await postJson(`${AUTH_BASE_PATHS[getState().auth.role]}/logout`);
  } catch (error) {
    return rejectWithValue(error.response?.data);
  }
});

// /me, PATCH /profile and POST /profile/photo all respond with the same full
// profile document (role/vertical populated) as `data`.
function storeUser(state, action) {
  state.user = action.payload.data;
  localStorage.setItem(appConfig.authUserKey, JSON.stringify(state.user));
}

function resetSession(state) {
  state.user = null;
  state.token = null;
  state.role = null;
  state.status = "idle";
  clearSession();
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.data.user;
        state.token = action.payload.data.token;
        state.role = action.payload.role;
        persistSession(state.user, state.token, state.role);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || action.error.message;
      })

      .addCase(fetchProfile.fulfilled, storeUser)
      .addCase(updateProfile.fulfilled, storeUser)
      .addCase(updateProfilePhoto.fulfilled, storeUser)

      .addCase(logoutUser.fulfilled, resetSession)
      .addCase(logoutUser.rejected, resetSession);
  },
});

export default authSlice.reducer;
