// Provider Mock Data generator scoped strictly to the authenticated provider.
import { PLATFORM_COMMISSION_RATE } from "./providerBookings.js";
import { buildAdminMockBookings } from "@/features/adminBooking/definitions/adminBookings.mock.js";

const pad = (value) => String(value).padStart(2, "0");
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Returns mock bookings strictly filtered/scoped to the given provider user.
 * Guarantees that a provider ONLY sees bookings where they are the assigned provider.
 */
export function buildProviderScopedMockBookings(providerUser, now = new Date()) {
  const all = buildAdminMockBookings(now);

  if (!providerUser) {
    // Default fallback to Imran Sheikh's bookings for initial store state
    return all.filter((item) => item.provider?.id === "prv-imran");
  }

  const userId = String(providerUser._id || providerUser.id || "").trim();
  const userName = String(providerUser.fullName || providerUser.name || "").trim().toLowerCase();
  const userPhone = String(providerUser.phone || providerUser.mobileNumber || "").replace(/\D/g, "");

  // 1. Check if the user matches one of the seeded demo providers
  const matched = all.filter((item) => {
    const p = item.provider;
    if (!p) return false;
    if (userId && (String(p.id) === userId || String(p._id) === userId)) return true;
    if (userName && p.name && p.name.trim().toLowerCase() === userName) return true;
    if (userPhone && p.phone && p.phone.replace(/\D/g, "").endsWith(userPhone.slice(-10))) return true;
    return false;
  });

  if (matched.length > 0) {
    return matched;
  }

  // 2. If the logged in provider is a new/custom account not in the demo set,
  // personalize a realistic set of assigned bookings specifically for this provider:
  // 1 pending request, 1 upcoming visit, 1 in-progress job, 1 completed awaiting cash, 1 paid, 1 rejected.
  const providerMeta = {
    id: userId || "prv-current",
    name: providerUser.fullName || providerUser.name || "Service Provider",
    phone: providerUser.phone || "+91 98300 12345",
    category: providerUser.category || "Home Services",
    rating: 4.8,
    jobsDone: 84,
  };

  const sampleIds = ["FXN-4QH7KD", "FXN-7RK5YC", "FXN-3VC6HE", "FXN-6YB9RT", "FXN-4LX7NP", "FXN-8BK3VL"];
  const samples = all.filter((b) => sampleIds.includes(b.id));

  return samples.map((booking) => {
    const isPending = booking.status === "pending";
    const status = booking.status;
    const provider = { ...providerMeta, vertical: booking.vertical };
    const createdAt = isPending
      ? new Date(now.getTime() - 25 * 60000).toISOString()
      : booking.createdAt;

    // Adapt activity notes to reference this provider
    const activity = [
      {
        status: "pending",
        note: `Booking assigned to ${provider.name}`,
        actor: "system",
        at: createdAt,
      },
    ];

    if (["accepted", "upcoming", "in_progress", "completed", "paid"].includes(status)) {
      activity.push({
        status: "upcoming",
        note: `${provider.name} accepted the booking`,
        actor: "provider",
        at: new Date(new Date(createdAt).getTime() + 30 * 60000).toISOString(),
      });
    }
    if (["in_progress", "completed", "paid"].includes(status)) {
      activity.push({
        status: "in_progress",
        note: `${provider.name} started the job`,
        actor: "provider",
        at: new Date(now.getTime() - 40 * 60000).toISOString(),
      });
    }
    if (["completed", "paid"].includes(status)) {
      activity.push({
        status: "completed",
        note: `${provider.name} marked the job completed`,
        actor: "provider",
        at: new Date(now.getTime() - 10 * 60000).toISOString(),
      });
    }
    if (status === "paid") {
      activity.push({
        status: "paid",
        note: `₹${booking.pricing.total.toLocaleString("en-IN")} received in cash`,
        actor: "provider",
        at: new Date(now.getTime() - 5 * 60000).toISOString(),
      });
    }
    if (status === "rejected") {
      activity.push({
        status: "rejected",
        note: `${provider.name} rejected the booking: ${booking.rejectionReason || "Not available"}`,
        actor: "provider",
        at: new Date(new Date(createdAt).getTime() + 15 * 60000).toISOString(),
      });
    }

    return {
      ...booking,
      provider,
      createdAt,
      activity,
    };
  });
}

export const buildMockBookings = (now = new Date()) => {
  return buildProviderScopedMockBookings(null, now);
};
