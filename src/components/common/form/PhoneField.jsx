import { useState } from "react";
import { Controller } from "react-hook-form";
// The "mobile" build validates against each country's mobile-number rules,
// e.g. India = 10 digits starting 6-9 (landlines/toll-free are rejected).
import PhoneInput, {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumber,
} from "react-phone-number-input/mobile";
import flags from "react-phone-number-input/flags";
import en from "react-phone-number-input/locale/en";
import "react-phone-number-input/style.css";

// Country names with their dialling code, e.g. "India (+91)", so the
// dropdown shows the code you're picking.
const LABELS = {
  ...en,
  ...Object.fromEntries(getCountries().map((country) => [country, `${en[country]} (+${getCountryCallingCode(country)})`])),
};

// How many digits a mobile number has after the country code (India -> [10],
// Germany -> [10, 11]). The library doesn't expose this, so try a few sample
// numbers of each length and keep the lengths that can be valid. ~20ms, once
// per country. Empty for the few countries the samples don't cover - those
// just get no digit hint.
const lengthCache = new Map();
function getMobileLengths(country) {
  if (!lengthCache.has(country)) {
    const lengths = [];
    for (let digits = 4; digits <= 15; digits += 1) {
      search: for (let prefix = 10; prefix <= 99; prefix += 1) {
        for (const filler of ["0", "1", "5"]) {
          if (isValidPhoneNumber(`${prefix}${filler.repeat(digits - 2)}`, country)) {
            lengths.push(digits);
            break search;
          }
        }
      }
    }
    lengthCache.set(country, lengths);
  }
  return lengthCache.get(country);
}

function describeLengths(lengths) {
  if (lengths.length === 0) return "";
  const min = lengths[0];
  const max = lengths[lengths.length - 1];
  return min === max ? `${min} digits` : `${min}-${max} digits`;
}

// Country part of a stored E.164 value ("+919876543210" -> "IN").
function countryOf(value) {
  try {
    return value ? parsePhoneNumber(value)?.country : undefined;
  } catch {
    return undefined;
  }
}

// Phone input with a country-code dropdown (react-phone-number-input), wired
// to react-hook-form. The form value is E.164 ("+919876543210"), or "" when
// empty. The hint and error spell out how many digits the chosen country
// expects; the schema does the actual check (isValidPhoneNumber).
export default function PhoneField({ id, label, name, control, error, defaultCountry = "IN" }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { ref, value, onChange, onBlur } }) => (
        <PhoneFieldInput
          id={id}
          label={label}
          name={name}
          inputRef={ref}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          error={error}
          defaultCountry={defaultCountry}
        />
      )}
    />
  );
}

function PhoneFieldInput({ id, label, name, inputRef, value, onChange, onBlur, error, defaultCountry }) {
  const [country, setCountry] = useState(() => countryOf(value) ?? defaultCountry);

  const countryLabel = country ? LABELS[country] : "the selected country";
  const lengths = country ? getMobileLengths(country) : [];
  const lengthText = describeLengths(lengths);

  // The schema only knows "invalid"; say why, in terms of the chosen country.
  let message = error;
  if (error && value && country) {
    const nationalDigits = value.replace(/\D/g, "").length - getCountryCallingCode(country).length;
    message =
      lengthText && !lengths.includes(nationalDigits)
        ? `${countryLabel} numbers must be ${lengthText}.`
        : `Enter a valid ${countryLabel} mobile number.`;
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label} <span className="text-rose-500">*</span>
      </label>
      <PhoneInput
        id={id}
        ref={inputRef}
        name={name}
        value={value || undefined}
        onChange={(next) => onChange(next ?? "")}
        onBlur={onBlur}
        onCountryChange={setCountry}
        defaultCountry={defaultCountry}
        international
        countryCallingCodeEditable={false}
        limitMaxLength
        flags={flags}
        labels={LABELS}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        className={`phone-field w-full rounded-lg border bg-slate-50 px-3.5 py-2 transition-all focus-within:ring-2 ${
          error
            ? "border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-500/40"
            : "border-gray-300 focus-within:border-teal-500 focus-within:ring-teal-500/50"
        }`}
        numberInputProps={{ className: "bg-transparent outline-none border-0 p-0 text-inherit" }}
      />
      {message ? (
        <p role="alert" className="text-xs font-medium text-rose-500">
          {message}
        </p>
      ) : (
        lengthText && <p className="text-xs text-slate-400">{`${countryLabel}: ${lengthText}`}</p>
      )}
    </div>
  );
}
