import { useEffect, useRef } from "react";

// Segmented one-time-code input - same behavior as fixonest_frontend's
// pages/auth/components/OtpInput.jsx, in this panel's teal style and without
// framer-motion (not installed here): the error shake uses the browser's own
// Web Animations API. `value` is a string of `length` characters where an
// empty box is a space, so clearing a middle digit never shifts the others.
// Handles typing, backspace, arrow keys, pasting a whole code into any box,
// and the phone keyboard's "one-time-code" autofill.
// status: "idle" | "error" | "success" - drives the box colors.
// shakeKey: bump it to replay the error shake.
const EMPTY = " ";

const BOX_STYLES = {
  idle: {
    empty: "border-slate-200 bg-white text-slate-900 focus:border-teal-500 focus:ring-teal-500/20",
    filled: "border-teal-300 bg-teal-50/70 text-teal-700 focus:border-teal-500 focus:ring-teal-500/20",
  },
  error: {
    empty: "border-rose-300 bg-rose-50/60 text-rose-600 focus:border-rose-400 focus:ring-rose-500/20",
    filled: "border-rose-300 bg-rose-50/60 text-rose-600 focus:border-rose-400 focus:ring-rose-500/20",
  },
  success: {
    empty: "border-emerald-300 bg-emerald-50 text-emerald-700",
    filled: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
};

export default function OtpInput({
  length = 4,
  value = "",
  onChange,
  onComplete,
  status = "idle",
  shakeKey = 0,
  disabled = false,
  autoFocus = false,
  ariaDescribedBy,
}) {
  const rowRef = useRef(null);
  const inputsRef = useRef([]);
  const digits = Array.from({ length }, (_, i) => (value[i] && value[i] !== EMPTY ? value[i] : ""));

  const focusBox = (index) => {
    const target = inputsRef.current[Math.max(0, Math.min(length - 1, index))];
    if (target) {
      target.focus();
      target.select();
    }
  };

  useEffect(() => {
    if (autoFocus) focusBox(0);
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a wrong code: shake the row and put the cursor back at the start
  // (the page clears the boxes).
  useEffect(() => {
    if (shakeKey === 0 || !rowRef.current) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) {
      rowRef.current.animate(
        [0, -12, 12, -9, 9, -5, 5, 0].map((x) => ({ transform: `translateX(${x}px)` })),
        { duration: 500, easing: "ease-in-out" },
      );
    }
    focusBox(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakeKey]);

  const commit = (nextDigits) => {
    onChange?.(nextDigits.map((digit) => digit || EMPTY).join(""));
    if (nextDigits.every(Boolean)) onComplete?.(nextDigits.join(""));
  };

  const fillFrom = (startIndex, text) => {
    const incoming = text.replace(/\D/g, "").slice(0, length);
    if (!incoming) return;
    // A full-length code always lands from the first box, wherever it was pasted.
    const start = incoming.length === length ? 0 : startIndex;
    const next = [...digits];
    incoming.split("").forEach((digit, offset) => {
      if (start + offset < length) next[start + offset] = digit;
    });
    commit(next);
    const firstEmpty = next.findIndex((digit) => !digit);
    focusBox(firstEmpty === -1 ? length - 1 : firstEmpty);
  };

  const handleChange = (index, event) => {
    const raw = event.target.value.replace(/\D/g, "");
    if (!raw) return;
    // Several digits at once = phone autofill or a paste routed through
    // onChange; one extra digit = typing over an existing digit.
    if (raw.length > 2) {
      fillFrom(index, raw);
      return;
    }
    const next = [...digits];
    next[index] = raw[raw.length - 1];
    commit(next);
    if (index < length - 1) focusBox(index + 1);
  };

  const handleKeyDown = (index, event) => {
    const next = [...digits];
    switch (event.key) {
      case "Backspace":
        event.preventDefault();
        if (next[index]) {
          next[index] = "";
          commit(next);
        } else if (index > 0) {
          next[index - 1] = "";
          commit(next);
          focusBox(index - 1);
        }
        break;
      case "Delete":
        event.preventDefault();
        next[index] = "";
        commit(next);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusBox(index - 1);
        break;
      case "ArrowRight":
        event.preventDefault();
        focusBox(index + 1);
        break;
      case "Home":
        event.preventDefault();
        focusBox(0);
        break;
      case "End":
        event.preventDefault();
        focusBox(length - 1);
        break;
      default:
    }
  };

  const palette = BOX_STYLES[status] ?? BOX_STYLES.idle;

  return (
    <div
      ref={rowRef}
      role="group"
      aria-label={`${length}-digit verification code`}
      className="mx-auto grid max-w-72 gap-3 sm:gap-4"
      style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
    >
      {digits.map((digit, index) => (
        <div
          key={index}
          className="relative animate-rise-in"
          style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}
        >
          <input
            ref={(element) => {
              inputsRef.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={length}
            value={digit}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={status === "error"}
            aria-describedby={ariaDescribedBy}
            onChange={(event) => handleChange(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => {
              event.preventDefault();
              fillFrom(index, event.clipboardData.getData("text"));
            }}
            onFocus={(event) => event.target.select()}
            className={`aspect-square w-full rounded-xl border-2 text-center text-2xl font-bold tabular-nums caret-teal-500 shadow-sm outline-none transition duration-200 focus:-translate-y-0.5 focus:shadow-lg focus:shadow-teal-500/15 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 sm:text-3xl ${
              status === "success" ? "scale-105" : ""
            } ${digit ? palette.filled : palette.empty}`}
          />
          {/* Small teal bar under a filled box - a quiet "got it" cue. */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute -bottom-2 left-1/2 h-1 -translate-x-1/2 rounded-full bg-linear-to-r from-teal-400 to-teal-600 transition-all duration-300 ${
              digit && status === "idle" ? "w-6 opacity-100" : "w-0 opacity-0"
            }`}
          />
        </div>
      ))}
    </div>
  );
}
