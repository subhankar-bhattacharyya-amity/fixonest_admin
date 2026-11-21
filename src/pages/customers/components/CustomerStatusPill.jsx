import { getCustomerAccountStatus } from '@/features/customer/index.js';

// Account-status badge shared by the customers table and the details dialog.
export default function CustomerStatusPill({ status }) {
  const { label, badge, dot } = getCustomerAccountStatus(status);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
