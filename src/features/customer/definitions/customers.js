import { BadgeCheck, PauseCircle } from "lucide-react";

// fixonest_backend/app/router/super_admin/customer.routes.js - Super Admin
// only. Customers self-register through the customer frontend, so the panel
// only lists them, shows one in detail and suspends/reactivates them; there is
// no create, edit or delete.
export const CUSTOMER_API_PATH = "/super-admin/api/v1/customers";

export const CUSTOMERS_PER_PAGE = 10;

// accountStatus of a live customer ("deactivated" accounts are never listed).
export const CUSTOMER_ACCOUNT_STATUSES = {
  active: {
    label: "Active",
    icon: BadgeCheck,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    dot: "bg-emerald-500",
  },
  suspended: {
    label: "Suspended",
    icon: PauseCircle,
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
};

export const getCustomerAccountStatus = (status) =>
  CUSTOMER_ACCOUNT_STATUSES[status] ?? CUSTOMER_ACCOUNT_STATUSES.active;

// phone is normally stored with its country code ("+919876543210"), so show it
// as-is. Only older records saved without one ("9876543210") get country_code
// prefixed, so the code never appears twice.
export const formatCustomerPhone = (customer) => {
  const phone = customer?.phone ?? "";
  if (!phone || phone.startsWith("+")) return phone;
  return [customer?.country_code, phone].filter(Boolean).join(" ");
};

// One address (user_details.addresses[]) as a single line, skipping empty parts.
export const formatCustomerAddress = (address) =>
  [address?.road, address?.city, address?.state, address?.pincode, address?.country].filter(Boolean).join(", ");
