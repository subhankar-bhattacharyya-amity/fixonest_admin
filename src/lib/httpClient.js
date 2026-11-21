import axios from "axios";
import { toast } from "sonner";
import { appConfig } from "./config.js";

// The one axios instance every API call in the app goes through.
const httpClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(appConfig.authTokenKey);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Same message extraction the interceptor below uses - exported so a caller
// that opted out of the global handler (see skipGlobalErrorHandler) can still
// surface an error identically when it decides the error is final.
export const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || "Something went wrong";

// Global error notifier: every failed API call anywhere in the app surfaces
// its backend message via Sonner here, so features never need to toast
// errors themselves - see app/AppProviders.jsx for the single <Toaster />.
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Opt-out for requests whose failure is expected and handled by the
    // caller - e.g. authSlice.js's loginUser tries each role's login endpoint
    // in turn, and a 401 from an earlier role just means "not this role".
    if (error.config?.skipGlobalErrorHandler) return Promise.reject(error);

    toast.error(getErrorMessage(error));

    // Only treat a 401 as "your session expired" when the failed request
    // actually carried a bearer token. Without this check, a plain wrong
    // password on a login endpoint (no token attached - the user isn't
    // logged in yet) would also wipe local storage and hard-redirect to
    // /login, reloading the page out from under the very form showing that error.
    const hadAuthHeader = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 401 && hadAuthHeader) {
      localStorage.removeItem(appConfig.authTokenKey);
      localStorage.removeItem(appConfig.authUserKey);
      localStorage.removeItem(appConfig.authRoleKey);
      window.location.href = appConfig.loginPath;
    }

    return Promise.reject(error);
  },
);

// The instance default above forces "Content-Type: application/json" on
// every request. Axios's transformRequest only lets a FormData body pass
// through untouched when it does NOT already see a JSON content type on the
// request - otherwise it JSON-stringifies the FormData, dropping the file and
// the multipart boundary entirely. So any FormData body needs that default
// header cleared per-request, letting axios/the browser set the correct
// "multipart/form-data; boundary=..." header itself.
// `data` is only for a DELETE that carries a JSON body (e.g. the vertical-admin
// API takes the target id in the body) - axios.delete has no body argument.
const requestConfig = (body, { signal, skipGlobalErrorHandler, data } = {}) => ({
  signal,
  skipGlobalErrorHandler,
  ...(data !== undefined ? { data } : {}),
  ...(body instanceof FormData ? { headers: { "Content-Type": undefined } } : {}),
});

// Thin, data-returning helpers on top of the instance above - every feature's
// thunks should call these instead of `httpClient.get/post/...` directly,
// so call sites get parsed JSON back instead of a full axios response.
export const getJson = (path, options) =>
  httpClient.get(path, requestConfig(undefined, options)).then((response) => response.data);

export const postJson = (path, body, options) =>
  httpClient.post(path, body, requestConfig(body, options)).then((response) => response.data);

export const putJson = (path, body, options) =>
  httpClient.put(path, body, requestConfig(body, options)).then((response) => response.data);

export const patchJson = (path, body, options) =>
  httpClient.patch(path, body, requestConfig(body, options)).then((response) => response.data);

export const deleteJson = (path, options) =>
  httpClient.delete(path, requestConfig(undefined, options)).then((response) => response.data);

export default httpClient;
