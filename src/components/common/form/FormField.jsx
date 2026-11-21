// Shared labeled input: label + input + error message, in this panel's own
// field style (the global .input-field class, same label treatment as the
// Settings and Login forms). Dumb/presentational - `registration` is the
// object returned by React Hook Form's `register(name)`, spread straight
// onto the input. Same role as fixonest_frontend's components/common/form.
export default function FormField({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  error,
  rightSlot,
  registration,
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className={`input-field bg-slate-50 ${rightSlot ? "pr-10" : ""} ${
            error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/40" : ""
          }`}
          {...registration}
        />
        {rightSlot && <span className="absolute inset-y-0 right-0 flex items-center pr-3">{rightSlot}</span>}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-rose-500">
          {error}
        </p>
      )}
    </div>
  );
}
