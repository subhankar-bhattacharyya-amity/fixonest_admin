import { ROLES } from "@/features/auth/index.js";

// fixonest_backend/app/router/super_admin/provider_assignment.routes.js and
// app/router/admin/provider_assignment.routes.js - the same
// /v1/provider-assignments endpoints under each role's base path (assign,
// list, a provider's categories, remove).
export const PROVIDER_ASSIGNMENT_API_PATHS = {
  [ROLES.SUPER_ADMIN]: "/super-admin/api/v1/provider-assignments",
  [ROLES.ADMIN]: "/admin/api/v1/provider-assignments",
};

// Rows shown per page of the listing (paged in the browser - see
// providerAssignmentSlice.js's fetchAssignmentBoard).
export const PROVIDER_ASSIGNMENTS_PER_PAGE = 10;

// Page size used while loading whole lists; the backend caps per_page
// server-side anyway.
export const ASSIGNMENT_FETCH_SIZE = 100;

export const ASSIGNMENT_FILTER = {
  ALL: "",
  PENDING: "pending",
  ASSIGNED: "assigned",
  UNASSIGNED: "unassigned",
};

// A suspended provider's categories can't be changed - the backend refuses
// new assignments (409) - so their row is shown disabled and a click on it
// only explains why.
export const isProviderSuspended = (provider) => provider?.accountStatus === "suspended";

export const suspendedProviderMessage = (provider) =>
  `${provider?.fullName || "This provider"} is suspended. Reactivate them in Provider Management to assign categories.`;

// Joins the three lists the page loads into one row per provider:
//   { provider, assignments: [{ assignmentId, category, assignedBy, assignedAt }] }
// plus how many providers each category has. A category missing from the
// catalogue (soft-deleted since it was assigned) still shows by the name
// stored on the assignment, flagged isRemoved. `restrictToCatalogue` drops
// those instead - used for an Admin, whose catalogue is their own vertical's
// categories while the assignment list covers every vertical.
export function buildAssignmentBoard(providers, categories, assignments, { restrictToCatalogue = false } = {}) {
  const categoryById = new Map(categories.map((category) => [category._id, category]));
  const entriesByProvider = new Map();
  const providerCountByCategory = new Map();

  assignments.forEach((assignment) => {
    const providerId = assignment.user_id?._id;
    const categoryId = assignment.category_id?._id;
    if (!providerId || !categoryId) return;

    const known = categoryById.get(categoryId);
    if (!known && restrictToCatalogue) return;

    const entries = entriesByProvider.get(providerId) ?? [];
    entries.push({
      assignmentId: assignment._id,
      category: known ?? { ...assignment.category_id, isRemoved: true },
      assignedBy: assignment.assign_by ?? null,
      assignedAt: assignment.createdAt,
      status: assignment.status ?? "Approved",
      statusChangedBy: assignment.statusChangedBy ?? null,
    });
    entriesByProvider.set(providerId, entries);
  });

  const rows = providers.map((provider) => ({
    provider,
    assignments: entriesByProvider.get(provider._id) ?? [],
  }));

  // Counted from the rows, so a deactivated provider's leftover assignments
  // (they are not in the provider list) never inflate a category's number.
  rows.forEach((row) => {
    row.assignments.forEach(({ category }) => {
      providerCountByCategory.set(category._id, (providerCountByCategory.get(category._id) ?? 0) + 1);
    });
  });

  return { rows, providerCountByCategory };
}
