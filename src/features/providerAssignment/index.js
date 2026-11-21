// Public API of the provider assignment feature. Import from
// "@/features/providerAssignment/index.js", never reach into hooks/, store/,
// or definitions/ from outside this folder.
export { useProviderAssignments } from "./hooks/useProviderAssignments.js";
export {
  PROVIDER_ASSIGNMENTS_PER_PAGE,
  ASSIGNMENT_FILTER,
  buildAssignmentBoard,
  isProviderSuspended,
  suspendedProviderMessage,
} from "./definitions/providerAssignments.js";
export {
  default as providerAssignmentReducer,
  fetchAssignmentBoard,
  saveProviderAssignments,
  removeProviderAssignment,
  updateProviderAssignmentStatus,
} from "./store/providerAssignmentSlice.js";
