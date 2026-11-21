// Public API of the service category feature. Import from
// "@/features/serviceCategory/index.js", never reach into hooks/, store/, or
// definitions/ from outside this folder.
export { useServiceCategories } from "./hooks/useServiceCategories.js";
export {
  SERVICE_CATEGORY_API_PATHS,
  SERVICE_CATEGORIES_PER_PAGE,
  SERVICE_CATEGORY_STATUS,
  SERVICE_CATEGORY_STATUSES,
  SERVICE_CATEGORY_NAME_MAX,
  SERVICE_CATEGORY_DESCRIPTION_MAX,
  SERVICE_CATEGORY_ICON_TYPES,
  SERVICE_CATEGORY_ICON_MAX_BYTES,
  getServiceCategoryStatus,
  buildServiceCategoryIconUrl,
} from "./definitions/serviceCategories.js";
export {
  serviceCategoryValidationSchema,
  superAdminServiceCategoryValidationSchema,
} from "./definitions/serviceCategoryValidation.js";
export {
  default as serviceCategoryReducer,
  fetchServiceCategories,
  createServiceCategory,
  updateServiceCategory,
  updateServiceCategoryStatus,
  deleteServiceCategory,
} from "./store/serviceCategorySlice.js";
