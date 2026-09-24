/**
 * Philippine Mobile Phone Number Validation & Formatting Utility
 */

const DUMMY_PATTERNS = [
  "09123456789", "09876543210", "09000000000", "09111111111", "09222222222",
  "09333333333", "09444444444", "09555555555", "09666666666", "09777777777",
  "09888888888", "09999999999", "09012345678", "09987654321", "09121212121",
  "09090909090"
];

/**
 * Clean and normalize a raw phone number input to 11 digits (09XXXXXXXXX).
 */
export function normalizePhilippineNumber(raw = "") {
  let clean = String(raw).replace(/[^0-9]/g, "");
  if (clean.startsWith("63")) {
    clean = "0" + clean.slice(2);
  } else if (clean.length === 10 && (clean.startsWith("9") || clean.startsWith("8"))) {
    clean = "0" + clean;
  }
  return clean;
}

/**
 * Format a phone number into readable "09XX XXX XXXX".
 */
export function formatPhilippineNumber(raw = "") {
  const clean = normalizePhilippineNumber(raw);
  if (clean.length <= 4) return clean;
  if (clean.length <= 7) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7, 11)}`;
}

/**
 * Deprecated: Telco network detection is removed due to Mobile Number Portability (MNP)
 * and inaccuracy with modern ported prefixes. Kept as stub for backward compatibility.
 */
export function detectTelcoNetwork(raw = "") {
  return null;
}

/**
 * Comprehensive client-side Philippine mobile validation (format & pattern checks without carrier detection).
 */
export function validatePhilippineMobile(raw = "") {
  const clean = normalizePhilippineNumber(raw);

  if (!clean) {
    return { isValid: false, telco: null, message: "Contact number is required." };
  }

  if (clean.length !== 11) {
    return {
      isValid: false,
      telco: null,
      message: "Mobile number must be exactly 11 digits (e.g. 0917 123 4567)."
    };
  }

  if (!clean.startsWith("09") && !clean.startsWith("08")) {
    return {
      isValid: false,
      telco: null,
      message: "Mobile number must start with 09 or 08."
    };
  }

  if (DUMMY_PATTERNS.includes(clean)) {
    return {
      isValid: false,
      telco: null,
      message: "Please enter an active personal/institutional contact number, not a dummy placeholder."
    };
  }

  // Check repetitive single-character sequence (e.g. 09170000000)
  if (/(\d)\1{6,}/.test(clean.slice(4))) {
    return {
      isValid: false,
      telco: null,
      message: "Number contains invalid repeated digit sequence."
    };
  }

  return {
    isValid: true,
    telco: null,
    cleanNumber: clean,
    formatted: formatPhilippineNumber(clean),
    message: "Valid Philippine mobile number."
  };
}
