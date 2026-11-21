// Public API of the dashboard feature. Import from "@/features/dashboard/index.js",
// never reach into hooks/, store/, or definitions/ from outside this folder.
export { useRecentContacts } from "./hooks/useRecentContacts.js";
export { useDashboardOverview } from "./hooks/useDashboardOverview.js";
export { RECENT_CONTACTS_LIMIT } from "./definitions/dashboard.js";
export { default as dashboardReducer, fetchRecentContacts, fetchDashboardOverview } from "./store/dashboardSlice.js";
