// Shared phone rules for forms that use components/common/form/PhoneField.jsx.
import { z } from "zod";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input/mobile";

// E.164 from the country-code dropdown (e.g. "+919876543210"), checked
// against the chosen country's mobile-number rules - India must be 10 digits
// starting 6-9, and so on. A valid value always also matches the backend's
// 7-15 digit rule.
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .refine((value) => isValidPhoneNumber(value), "Enter a valid phone number for the selected country");

// Older records may have a phone saved without a country code
// ("9876543210"). Read those as Indian numbers so an edit form opens with
// "+91" selected; anything unreadable is left as-is for the user to fix.
export const toInternationalPhone = (phone, defaultCountry = "IN") => {
  if (!phone) return "";
  try {
    return parsePhoneNumber(phone, defaultCountry)?.number ?? phone;
  } catch {
    return phone;
  }
};
