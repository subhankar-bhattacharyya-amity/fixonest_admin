import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import FormField from "./FormField.jsx";

// Password input built on FormField, adding its own show/hide toggle - same
// eye button as the Login and Settings password fields.
export default function PasswordField({ id, label, error, autoComplete, registration }) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField
      id={id}
      label={label}
      type={visible ? "text" : "password"}
      error={error}
      autoComplete={autoComplete}
      registration={registration}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="text-slate-400 hover:text-teal-600 transition-colors"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
    />
  );
}
