import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchProfile } from "../store/authSlice.js";
import { useAuth } from "../hooks/useAuth.js";

// Mounted once in app/AppProviders.jsx. If a session survived from a previous
// visit, re-fetch the profile on a fresh page load so an expired/revoked
// token is caught immediately (httpClient's 401 handler then clears it and
// redirects) instead of only surfacing on the next API call.
export default function AuthBootstrap() {
  const dispatch = useDispatch();
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      dispatch(fetchProfile());
    }
    // Only on mount - a fresh login already has the profile it needs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  return null;
}
