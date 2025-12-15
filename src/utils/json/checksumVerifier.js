/**
 * Utility functions for verifying JSON checksums
 */

/**
 * Canonicalize a value for consistent hashing
 * @param {*} value - Value to canonicalize
 * @returns {*} Canonicalized value
 */
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    const keys = Object.keys(value).filter(k => k !== "checksum" && k !== "checksumRaw").sort();
    for (const k of keys) out[k] = canonicalize(value[k]);
    return out;
  }
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  return value;
}

/**
 * Stringify object in canonical form
 * @param {Object} obj - Object to stringify
 * @returns {string} Canonical JSON string
 */
function canonicalStringify(obj) {
  return JSON.stringify(canonicalize(obj));
}

/**
 * Compute SHA-256 hash of a string
 * @param {string} str - String to hash
 * @returns {Promise<string>} Hash as hex string
 */
async function sha256String(str) {
  if (window.crypto?.subtle) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  // fallback (non-crypto)
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return "fallback_" + Math.abs(h).toString(16);
}

/**
 * Compute checksum of an object
 * @param {Object} obj - Object to hash
 * @returns {Promise<string>} Checksum hash
 */
async function computeChecksum(obj) {
  return sha256String(canonicalStringify(obj));
}

/**
 * Replace the checksumRaw value with "" while preserving surrounding formatting
 * @param {string} jsonText - JSON text with checksumRaw field
 * @returns {string} JSON text with blanked checksumRaw
 */
export function blankChecksumRawInText(jsonText) {
  // Matches: "checksumRaw" : "anything including escapes"
  // and replaces the string with empty string ""
  return jsonText.replace(
    /("checksumRaw"\s*:\s*)"(?:[^"\\]|\\.)*"/,
    '$1""'
  );
}

/**
 * Verify both raw and canonical checksums
 * @param {string} originalText - Original JSON text
 * @returns {Promise<Object>} Verification result
 */
export async function verifyDualChecksums(originalText) {
  // Parse first to get fields
  let parsed;
  try {
    parsed = JSON.parse(originalText);
  } catch {
    return { ok: false, reason: "Invalid JSON", fail: "parse" };
  }

  // 1) Raw checksum check
  if (typeof parsed.checksumRaw !== "string") {
    return { ok: false, reason: "Missing checksumRaw", fail: "raw-missing" };
  }
  const blanked = blankChecksumRawInText(originalText);
  const actualRaw = await sha256String(blanked);
  const okRaw = parsed.checksumRaw === actualRaw;

  // 2) Canonical object checksum (optional but recommended)
  if (typeof parsed.checksum !== "string") {
    return { ok: false, reason: "Missing checksum", fail: "canon-missing", okRaw };
  }
  // Exclude both checksums for canonical hashing
  const { checksum, checksumRaw, ...rest } = parsed;
  const actualCanon = await computeChecksum(rest);
  const okCanon = parsed.checksum === actualCanon;

  return {
    ok: okRaw && okCanon,
    okRaw,
    okCanon,
    expectedRaw: parsed.checksumRaw,
    actualRaw,
    expectedCanon: parsed.checksum,
    actualCanon,
    parsed, // return parsed for the caller
  };
}
