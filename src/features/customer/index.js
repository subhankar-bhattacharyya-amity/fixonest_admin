// Public API of the customer feature. Import from "@/features/customer/index.js",
// never reach into hooks/, store/, or definitions/ from outside this folder.
export { useCustomers } from "./hooks/useCustomers.js";
export {
  CUSTOMERS_PER_PAGE,
  CUSTOMER_ACCOUNT_STATUSES,
  getCustomerAccountStatus,
  formatCustomerPhone,
  formatCustomerAddress,
} from "./definitions/customers.js";
export {
  default as customerReducer,
  fetchCustomers,
  fetchCustomerSummary,
  fetchCustomerDetails,
  updateCustomerStatus,
  clearCustomerDetails,
} from "./store/customerSlice.js";
