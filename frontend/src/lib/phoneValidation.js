/**
 * Philippine Mobile Phone Number Validation & Telco Detection Utility
 */

export const PH_TELCO_PREFIXES = {
  Globe: [
    "0905", "0906", "0915", "0916", "0917", "0926", "0927", "0935", "0936", "0945",
    "0953", "0954", "0955", "0956", "0965", "0966", "0967", "0975", "0976", "0977",
    "0978", "0979", "0995", "0996", "0997"
  ],
  Smart: [
    "0907", "0908", "0909", "0910", "0911", "0912", "0914", "0918", "0919", "0920",
    "0921", "0928", "0929", "0930", "0938", "0939", "0946", "0947", "0948", "0949",
    "0950", "0951", "0961", "0963", "0968", "0969", "0970", "0971", "0981", "0989",
    "0992", "0998", "0999"
  ],
  DITO: [
    "0991", "0992", "0993", "0994", "0895", "0896", "0897", "0898"
  ]
};

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
 * Detect Philippine Telecom Network based on 4-digit prefix.
 */
export function detectTelcoNetwork(raw = "") {
  const clean = normalizePhilippineNumber(raw);
  if (clean.length < 4) return null;
  const prefix = clean.slice(0, 4);

  if (PH_TELCO_PREFIXES.Globe.includes(prefix)) return "Globe / TM";
  if (PH_TELCO_PREFIXES.Smart.includes(prefix)) return "Smart / TNT";
  if (PH_TELCO_PREFIXES.DITO.includes(prefix)) return "DITO";

  return null;
}

/**
 * Comprehensive client-side Philippine mobile validation.
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

  const telco = detectTelcoNetwork(clean);
  if (!telco) {
    return {
      isValid: false,
      telco: null,
      message: `Prefix '${clean.slice(0, 4)}' is not a recognized Philippine telco carrier.`
    };
  }

  return {
    isValid: true,
    telco,
    cleanNumber: clean,
    formatted: formatPhilippineNumber(clean),
    message: `Valid ${telco} mobile number.`
  };
}
