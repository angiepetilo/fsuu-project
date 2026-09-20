import React, { useMemo, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, ShieldAlert, Info, ChevronDown, KeyRound, Sparkles } from "lucide-react";

/**
 * Common trivial passwords/dictionary words to flag
 */
const COMMON_DICTIONARY_WORDS = [
  "password", "12345678", "123456789", "admin123", "qwertyuiop",
  "fsuu1234", "welcome1", "student123", "pass1234", "password123"
];

/**
 * Evaluates password against security guidelines (Screenshot 3).
 * Rules:
 * 1. At least 8 characters
 * 2. Mix of upper and lowercase characters
 * 3. Mix of alpha and numeric characters
 * 4. Special character or symbol
 * 5. Not dictionary word
 */
export function checkPasswordSecurity(password = "") {
  const pwd = String(password || "");
  const hasLength = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasMixedCase = hasUpper && hasLower;
  const hasNumber = /[0-9]/.test(pwd);
  const hasAlpha = /[a-zA-Z]/.test(pwd);
  const hasAlphaNumeric = hasAlpha && hasNumber;
  const hasSymbol = /[^a-zA-Z0-9]/.test(pwd);
  const isDictionaryWord = COMMON_DICTIONARY_WORDS.some(w => pwd.toLowerCase().includes(w));

  let score = 0;
  if (hasLength) score += 1;
  if (hasMixedCase) score += 1;
  if (hasAlphaNumeric) score += 1;
  if (hasSymbol) score += 1;
  if (pwd.length >= 12) score += 1; // bonus for passphrase length
  if (isDictionaryWord) score = Math.max(1, score - 1);

  let label = "Very Weak";
  let color = "bg-rose-500 text-rose-600";
  let barWidth = "15%";

  if (score >= 4 && !isDictionaryWord && hasLength && hasMixedCase && hasAlphaNumeric) {
    label = "Strong";
    color = "bg-emerald-500 text-emerald-600";
    barWidth = "100%";
  } else if (score >= 3 && hasLength) {
    label = "Good";
    color = "bg-blue-500 text-blue-600";
    barWidth = "75%";
  } else if (score >= 2) {
    label = "Fair";
    color = "bg-amber-500 text-amber-600";
    barWidth = "50%";
  } else if (pwd.length > 0) {
    label = "Weak";
    color = "bg-rose-500 text-rose-600";
    barWidth = "25%";
  } else {
    label = "Enter Password";
    color = "bg-slate-300 text-slate-400";
    barWidth = "0%";
  }

  // Meets baseline required security threshold
  const isValid = hasLength && hasMixedCase && hasAlphaNumeric && !isDictionaryWord;

  return {
    hasLength,
    hasMixedCase,
    hasAlphaNumeric,
    hasSymbol,
    isDictionaryWord,
    score,
    label,
    color,
    barWidth,
    isValid,
  };
}

export default function PasswordSecurityStrength({
  password = "",
  showGuidance = true,
  className = "",
}) {
  const [showTips, setShowTips] = useState(false);
  const analysis = useMemo(() => checkPasswordSecurity(password), [password]);

  if (!password && !showGuidance) return null;

  return (
    <div className={`space-y-3 pt-1 text-xs select-none ${className}`}>
      {/* Strength Bar & Rating */}
      {password.length > 0 && (
        <div className="space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <KeyRound size={12} className="text-slate-400" />
              Password Strength:
            </span>
            <span className={`font-mono uppercase tracking-wider font-extrabold ${analysis.color.split(" ")[1]}`}>
              {analysis.label}
            </span>
          </div>

          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${analysis.color.split(" ")[0]}`}
              style={{ width: analysis.barWidth }}
            />
          </div>
        </div>
      )}

      {/* Requirement Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px]">
        <div className="flex items-center gap-1.5">
          {analysis.hasLength ? (
            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <XCircle size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
          )}
          <span className={analysis.hasLength ? "text-slate-800 dark:text-slate-200 font-bold" : "text-slate-500 dark:text-slate-400"}>
            At least 8 characters
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {analysis.hasMixedCase ? (
            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <XCircle size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
          )}
          <span className={analysis.hasMixedCase ? "text-slate-800 dark:text-slate-200 font-bold" : "text-slate-500 dark:text-slate-400"}>
            Mix of upper &amp; lowercase (A-Z, a-z)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {analysis.hasAlphaNumeric ? (
            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <XCircle size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
          )}
          <span className={analysis.hasAlphaNumeric ? "text-slate-800 dark:text-slate-200 font-bold" : "text-slate-500 dark:text-slate-400"}>
            Mix of letters &amp; numbers (0-9)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {analysis.hasSymbol ? (
            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <XCircle size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
          )}
          <span className={analysis.hasSymbol ? "text-slate-800 dark:text-slate-200 font-bold" : "text-slate-500 dark:text-slate-400"}>
            Special symbol (!@#$...)
          </span>
        </div>

        {analysis.isDictionaryWord && (
          <div className="col-span-full text-rose-600 font-bold text-[10.5px] flex items-center gap-1 pt-1 border-t border-rose-100">
            <ShieldAlert size={12} className="shrink-0" />
            <span>Avoid common dictionary words (e.g. "password", "fsuu123").</span>
          </div>
        )}
      </div>

      {/* Password Security Best Practices Accordion (Screenshot 3) */}
      {showGuidance && (
        <div className="rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 overflow-hidden text-[11px]">
          <button
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="w-full px-3 py-2 flex items-center justify-between text-blue-900 dark:text-blue-200 font-extrabold cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/40 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-blue-600 dark:text-blue-400" />
              Password Security Tips &amp; Passphrases
            </span>
            <ChevronDown
              size={14}
              className={`text-blue-700 dark:text-blue-300 transition-transform duration-200 ${
                showTips ? "rotate-180" : ""
              }`}
            />
          </button>

          {showTips && (
            <div className="p-3 pt-1 space-y-2 text-slate-700 dark:text-slate-300 border-t border-blue-200/60 dark:border-blue-900/40 font-medium">
              <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-blue-100 dark:border-blue-900/50">
                <span className="font-bold text-blue-800 dark:text-blue-300 block mb-0.5">
                  How to select a strong passphrase:
                </span>
                <p className="font-mono text-[10.5px] text-slate-600 dark:text-slate-400">
                  "I was Born on May 9 nineteen90 #" &rarr;{" "}
                  <strong className="text-blue-600 dark:text-blue-400 font-black">IwBoM9n90#</strong>
                </p>
              </div>

              <ul className="list-disc list-inside space-y-1 text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                <li>Change passwords frequently and do not share credentials.</li>
                <li>Never reuse the same password across multiple institutional systems.</li>
                <li>Avoid writing down passwords on notes or unencrypted files.</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
