// server/utils/password.js
// Password validation utilities

/**
 * Validate room password against policy requirements
 * @param {string} pwRaw - Raw password input
 * @returns {{ok: boolean, error?: string, password?: string}} Validation result
 */
function validateRoomPassword(pwRaw) {
  const pw = (pwRaw ?? "").toString().trim();

  // Required
  if (!pw) return { ok: false, error: "Password is required." };

  // Policy (adjust to match your frontend exactly if needed)
  if (pw.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (!/[A-Za-z]/.test(pw)) return { ok: false, error: "Password must include at least 1 letter." };
  if (!/[0-9]/.test(pw)) return { ok: false, error: "Password must include at least 1 number." };
  if (!/[^A-Za-z0-9]/.test(pw)) return { ok: false, error: "Password must include at least 1 special character." };

  return { ok: true, password: pw };
}

module.exports = {
  validateRoomPassword,
};
