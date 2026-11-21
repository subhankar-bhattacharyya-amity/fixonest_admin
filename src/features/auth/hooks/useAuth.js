import { useSelector } from "react-redux";

// Read-only view of the auth slice ({ user, token, role, status, error }).
// Actions (loginUser, fetchProfile, logoutUser) are createAsyncThunks
// dispatched directly via react-redux's useDispatch() - see
// features/auth/store/authSlice.js.
export function useAuth() {
  return useSelector((state) => state.auth);
}
