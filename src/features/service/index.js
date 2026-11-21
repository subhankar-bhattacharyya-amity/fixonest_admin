// Public API of the service feature. Import from "@/features/service/index.js",
// never reach into hooks/, store/, or definitions/ from outside this folder.
export { useServices } from "./hooks/useServices.js";
export {
  SERVICES_PER_PAGE,
  SERVICE_STATUS,
  SERVICE_STATUSES,
  SERVICE_FEATURED_LIMIT,
  SERVICE_GALLERY_LIMIT,
  SERVICE_NAME_MAX,
  SERVICE_DESCRIPTION_MAX,
  SERVICE_OVERVIEW_MAX,
  SERVICE_DURATION_LABEL_MAX,
  SERVICE_LIST_ITEM_MAX,
  SERVICE_LIST_LIMIT,
  SERVICE_IMAGE_TYPES,
  SERVICE_IMAGE_MAX_BYTES,
  SERVICE_SORTS,
  getServiceStatus,
  buildServiceImageUrl,
  formatServicePrice,
  getServicePricing,
  formatServiceDuration,
} from "./definitions/services.js";
export { serviceValidationSchema } from "./definitions/serviceValidation.js";
export {
  default as serviceReducer,
  fetchServices,
  fetchServiceSummary,
  fetchServiceById,
  fetchServiceCategoryOptions,
  createService,
  updateService,
  updateServiceStatus,
  toggleServiceFeatured,
  deleteService,
} from "./store/serviceSlice.js";
