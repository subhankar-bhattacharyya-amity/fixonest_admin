// The Admin's "Bookings": every booking in the Admin's vertical, whoever the
// provider is. Statuses, formatters and status colours are shared with the
// provider's bookings (features/providerBooking); this file adds what only an
// Admin can do - reassign a booking to another provider, or cancel it.

export const ADMIN_BOOKING_ACTIONS = {
  REASSIGN: "reassign",
  CANCEL: "cancel",
  ACCEPT: "accept",
  REJECT: "reject",
};

// Which statuses each Admin action is allowed from.
const ALLOWED_FROM = {
  reassign: ["pending", "accepted", "upcoming", "rejected"],
  cancel: ["pending", "accepted", "upcoming", "rejected"],
  accept: ["pending"],
  reject: ["pending"],
};

export const canAdminAct = (booking, action) => Boolean(ALLOWED_FROM[action]?.includes(booking.status));

// Returns the booking after the Admin's action (a new object), or throws when
// it isn't allowed. payload: reassign -> { provider, note }, cancel -> { reason }, reject -> { reason }.
export const applyAdminAction = (booking, action, payload = {}, at = new Date().toISOString()) => {
  if (!canAdminAct(booking, action)) {
    throw new Error(`Can't ${action} a booking that is ${booking.status}`);
  }

  if (action === ADMIN_BOOKING_ACTIONS.ACCEPT) {
    return {
      ...booking,
      status: "upcoming",
      acceptedAt: at,
      activity: [
        ...(booking.activity || []),
        {
          status: "upcoming",
          note: "Booking accepted by admin",
          actor: "admin",
          at,
        },
      ],
    };
  }

  if (action === ADMIN_BOOKING_ACTIONS.REJECT) {
    const reason = payload.reason || payload.rejectionReason || "Rejected by administrator";
    return {
      ...booking,
      status: "rejected",
      rejectionReason: reason,
      rejectedAt: at,
      activity: [
        ...(booking.activity || []),
        {
          status: "rejected",
          note: `Booking rejected by admin: ${reason}`,
          actor: "admin",
          at,
        },
      ],
    };
  }

  if (action === ADMIN_BOOKING_ACTIONS.REASSIGN) {
    const note = payload.note?.trim();
    // Remember who had the booking before, and how it ended for them.
    const previous = {
      id: booking.provider.id,
      name: booking.provider.name,
      outcome: booking.status === "rejected" ? "rejected" : "reassigned",
      reason: booking.status === "rejected" ? booking.rejectionReason : note || null,
      at,
    };
    return {
      ...booking,
      status: "pending",
      provider: payload.provider,
      previousProviders: [...(booking.previousProviders ?? []), previous],
      rejectionReason: null,
      acceptedAt: null,
      expiresAt: new Date(new Date(at).getTime() + 2 * 3600000).toISOString(),
      activity: [
        ...(booking.activity || []),
        {
          status: "pending",
          note: `Reassigned to ${payload.provider.name}${note ? `: ${note}` : ""}`,
          actor: "admin",
          at,
        },
      ],
    };
  }

  return {
    ...booking,
    status: "cancelled",
    cancellationReason: payload.reason,
    cancelledBy: "admin",
    activity: [...(booking.activity || []), { status: "cancelled", note: `Cancelled by admin: ${payload.reason}`, actor: "admin", at }],
  };
};

// ---- Reassignment helpers ----

// Providers who already turned this booking down (including the current one
// when it's rejected) - they can't be offered it again.
export const getRejectedProviderIds = (booking) => {
  const ids = new Set((booking.previousProviders ?? []).filter((entry) => entry.outcome === "rejected").map((entry) => entry.id));
  if (booking.status === "rejected") ids.add(booking.provider.id);
  return ids;
};

// Small stable hash, for the DUMMY part of availability below.
const hash = (text) => {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) >>> 0;
  return value;
};

const overlaps = (a, b) => a.scheduledDate === b.scheduledDate && a.startHour < b.endHour && b.startHour < a.endHour;
const LIVE = ["pending", "accepted", "in_progress"];

// Can `provider` take `booking`'s slot? Busy when they already have a live
// booking that overlaps it (checked against the real list); otherwise ~1 in 5
// are marked "off that day" - DUMMY until providers have a real calendar.
export const getProviderAvailability = (provider, booking, allBookings) => {
  const clash = allBookings.find(
    (other) => other.id !== booking.id && other.provider.id === provider.id && LIVE.includes(other.status) && overlaps(other, booking),
  );
  if (clash) return { free: false, reason: `Busy with ${clash.service.name}` };
  if (hash(`${provider.id}|${booking.scheduledDate}|${booking.startHour}`) % 5 === 0) return { free: false, reason: "Off at this time" };
  return { free: true, reason: null };
};

// Every provider of the booking's vertical (except the current one), with
// whether they can take it: blocked if they rejected it, else free / busy.
// Sorted: free same-category first, then free others, then busy, then blocked;
// best rated first within each group.
export const rankProvidersForBooking = (booking, providers, allBookings) => {
  const rejected = getRejectedProviderIds(booking);
  const rank = (row) => (row.rejectedBefore ? 3 : !row.availability.free ? 2 : row.bestMatch ? 0 : 1);
  return providers
    .filter((provider) => provider.vertical?.id === booking.vertical?.id && provider.id !== booking.provider.id)
    .map((provider) => ({
      ...provider,
      bestMatch: provider.category === booking.service.category,
      rejectedBefore: rejected.has(provider.id),
      availability: getProviderAvailability(provider, booking, allBookings),
    }))
    .sort((a, b) => rank(a) - rank(b) || b.rating - a.rating);
};

// Can be assigned right now: free and hasn't rejected it.
export const isAssignable = (row) => row.availability.free && !row.rejectedBefore;

export const ADMIN_BOOKING_TABS = [
  { key: "all", label: "All", statuses: [] },
  { key: "pending", label: "Awaiting provider", statuses: ["pending"] },
  { key: "accepted", label: "Upcoming", statuses: ["accepted", "upcoming"] },
  { key: "in_progress", label: "In progress", statuses: ["in_progress"] },
  { key: "completed", label: "Completed", statuses: ["completed", "paid"] },
  { key: "rejected", label: "Rejected", statuses: ["rejected"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

export const ADMIN_CANCEL_REASONS = [
  "Customer asked to cancel",
  "No provider available for this slot",
  "Duplicate booking",
  "Address outside our service area",
];

export const ADMIN_BOOKINGS_PER_PAGE = 10;

export const matchesAdminBookingSearch = (booking, search) => {
  const text = search.trim().toLowerCase();
  if (!text) return true;
  return [booking.bookingNumber, booking.id, booking.customer?.name, booking.customer?.phone, booking.service?.name, booking.provider?.name]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(text));
};
