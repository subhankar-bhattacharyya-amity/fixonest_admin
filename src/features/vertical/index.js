// Public API of the vertical feature. Import from "@/features/vertical/index.js",
// never reach into hooks/, store/, or definitions/ from outside this folder.
export { useVerticals } from "./hooks/useVerticals.js";
export {
  VERTICALS_PER_PAGE,
  VERTICAL_KEY_MAX,
  getVerticalVisual,
  getDefaultDisplayName,
  toVerticalKey,
} from "./definitions/verticals.js";
export { verticalValidationSchema } from "./definitions/verticalValidation.js";
export {
  default as verticalReducer,
  fetchVerticals,
  fetchVerticalById,
  createVertical,
  updateVertical,
  deleteVertical,
} from "./store/verticalSlice.js";
