import { useSelector } from "react-redux";

// Read-only view of the provider profile slice ({ details, status,
// categories }). Loading is done by dispatching the slice's thunks - see
// features/providerProfile/store/providerProfileSlice.js.
export function useProviderProfile() {
  return useSelector((state) => state.providerProfile);
}
