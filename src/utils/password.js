// Password helpers shared by every "set a new account's password" form
// (vertical admins, providers). Framework-independent, like the rest of utils/.

// Rough strength of a new password, 0-4, for a form's strength meter. The
// backend only enforces 8+ characters with a letter and a digit; this just
// nudges toward something stronger.
export const PASSWORD_STRENGTH_LEVELS = [
  { label: "Too weak", bar: "bg-rose-400", text: "text-rose-500" },
  { label: "Weak", bar: "bg-rose-400", text: "text-rose-500" },
  { label: "Fair", bar: "bg-amber-400", text: "text-amber-600" },
  { label: "Good", bar: "bg-teal-400", text: "text-teal-600" },
  { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
];

export function getPasswordStrength(password = "") {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  // Anything failing the backend's own rule never shows better than "Weak".
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) score = Math.min(score, 1);
  return score;
}

// A random 14-character password that always passes the backend's rule and
// scores "Strong": at least one lowercase, uppercase, digit and symbol, from
// an alphabet without look-alike characters (0/O, 1/l/I).
export function generateStrongPassword(length = 14) {
  const sets = ["abcdefghijkmnpqrstuvwxyz", "ABCDEFGHJKLMNPQRSTUVWXYZ", "23456789", "!@#$%&*?"];
  const all = sets.join("");
  const random = (max) => crypto.getRandomValues(new Uint32Array(1))[0] % max;
  const chars = sets.map((set) => set[random(set.length)]);
  while (chars.length < length) chars.push(all[random(all.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
