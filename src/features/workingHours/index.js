// Public API of the working-hours feature (Settings' holidays and business
// hours). Import from "@/features/workingHours/index.js", never reach into
// hooks/, store/, or definitions/ from outside this folder.
export { useWorkingHours } from "./hooks/useWorkingHours.js";
export {
  WEEK_DAYS,
  WORKING_HOURS_API_PATHS,
  WORKING_HOURS_API_PATH,
  HOLIDAY_TYPES,
  HOLIDAY_TYPE_OPTIONS,
  HOLIDAY_TITLE_MAX,
  HOLIDAY_DESCRIPTION_MAX,
  BREAK_TITLE_MAX,
  SLOT_SETTING_FIELDS,
  getHolidayType,
  toMinutes,
  fromMinutes,
  formatTime,
  formatDuration,
  workingMinutes,
  buildSlots,
  todayString,
  parseDate,
  nextOccurrence,
  daysUntil,
  relativeDayLabel,
  formatLongDate,
} from "./definitions/workingHours.js";
export { holidayValidationSchema, workingHoursValidationSchema } from "./definitions/workingHoursValidation.js";
export {
  default as workingHoursReducer,
  fetchWorkingHours,
  saveWorkingHours,
  addHoliday,
  updateHoliday,
  deleteHoliday,
} from "./store/workingHoursSlice.js";
