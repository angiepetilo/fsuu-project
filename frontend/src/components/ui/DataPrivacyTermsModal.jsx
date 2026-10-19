import { useState, useEffect } from "react";
import { X, ShieldCheck, FileText, CheckCircle2, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DataPrivacyTermsModal({
  isOpen,
  onClose,
  onAccept,
  initialTab = "privacy", // 'privacy' | 'terms'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync active tab whenever modal opens with initialTab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || "privacy");
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const isPrivacy = activeTab === "privacy";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Plain Clean Header */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-900/40">
              {isPrivacy ? <ShieldCheck size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                {isPrivacy ? "Privacy Policy" : "Terms and Conditions"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Father Saturnino Urios University
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Segmented Pill Navigation */}
        <div className="px-6 sm:px-7 pt-4 pb-2 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200/70 dark:border-slate-800 shrink-0 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("privacy")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isPrivacy
                  ? "bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Shield size={13} />
              <span>Privacy Policy</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("terms")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !isPrivacy
                  ? "bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText size={13} />
              <span>Terms &amp; Conditions</span>
            </button>
          </div>

          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 hidden sm:inline-block">
            {isPrivacy ? "Republic Act No. 10173" : "Facilities & Equipment Guidelines"}
          </span>
        </div>

        {/* Scrollable Content Body with Clean Cards */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 bg-slate-100/70 dark:bg-slate-950/60 flex-1">
          {isPrivacy ? (
            /* ── Privacy Policy Cards ── */
            <>
              {/* Card 1: Introduction */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-4.5 rounded-full bg-amber-500 shrink-0" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Introduction
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal pl-4">
                  Father Saturnino Urios University ("FSUU", "we", "us", or "our") respects your privacy. This Privacy Policy explains how we collect, use, store, and protect personal information when you use our official facilities and equipment booking system and related online services.
                </p>
              </div>

              {/* Card 2: Data Privacy Act of 2012 */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-4.5 rounded-full bg-amber-500 shrink-0" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Data Privacy Act of 2012
                  </h3>
                </div>
                <div className="pl-4 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200 block">
                    Republic Act No. 10173
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    The processing of personal information shall be allowed, subject to compliance with the requirements of this Act and other laws allowing disclosure of information to the public, and adherence to the principles of transparency, legitimate purpose, and proportionality.
                  </p>
                </div>
              </div>

              {/* Card 3: Information We Collect */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-4.5 rounded-full bg-amber-500 shrink-0" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Information We Collect
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal pl-4">
                  When you submit a venue reservation or equipment borrowing request, we collect the borrower’s Full Name, Institutional Email Address, Active Contact Number, Department or College Affiliation, Borrower Classification (Student, Faculty, or External Filer), and Purpose of Use.
                </p>
              </div>

              {/* Card 4: How We Use Your Information */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-4.5 rounded-full bg-amber-500 shrink-0" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Use of Information &amp; Notifications
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal pl-4">
                  Collected data is strictly utilized to process facility reservations, verify custodianship eligibility, dispatch official SMS and email reservation tracking numbers and live status updates, and document security accountability for physical university assets.
                </p>
              </div>

              {/* Card 5: Protection & Confidentiality */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-4.5 rounded-full bg-amber-500 shrink-0" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Data Protection &amp; Confidentiality
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal pl-4">
                  All collected records are encrypted and stored in secure institutional databases. Access is limited strictly to authorized AVR personnel and system administrators. We do not sell, rent, or disclose personal data to third parties.
                </p>
              </div>
            </>
          ) : (
            /* ── Terms & Conditions Cards ── */
            <>
              {/* Card 1: Acceptance of Terms */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-4.5 rounded-full bg-amber-500 shrink-0" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Acceptance of Terms
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal pl-4">
                  By accessing and using the Father Saturnino Urios University facilities and equipment booking system, you agree to comply with these Terms and Conditions. If you do not agree, please do not use this service.
                </p>
              </div>

              {/* Card 2: Use of Facilities & Physical Equipment */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-4.5 rounded-full bg-amber-500 shrink-0" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Custodianship &amp; Physical Liability
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal pl-4">
                  The borrower and requesting organization assume full financial and physical custody for all reserved venues and assigned physical equipment units from the moment of release until formal return and custodian inspection.
                </p>
              </div>

              {/* Card 3: User Conduct & Campus Rules */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-4.5 rounded-full bg-amber-500 shrink-0" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    User Conduct &amp; Safety Regulations
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal pl-4">
                  Eating, drinking (except bottled water), smoking, vaping, or open flames are strictly prohibited inside AVR centers and facilities. Users are granted a 15–20 minute grace period from the scheduled start time; unexcused delays may trigger automatic reservation cancellation.
                </p>
              </div>

              {/* Card 4: Inspection & Fee Liabilities */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-4.5 rounded-full bg-amber-500 shrink-0" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Inspection, Damage &amp; Liabilities
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal pl-4">
                  Physical units must be inspected at the AVR counter upon release. Any existing defects or missing parts must be noted immediately. Lost, damaged, or unreturned equipment will be assessed in accordance with the official University Fee Matrix for repair or replacement.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer with "I Understand" Button */}
        <div className="px-6 sm:px-7 py-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden sm:block">
            Father Saturnino Urios University • Official Policy
          </p>
          <div className="flex items-center gap-2.5 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-bold rounded-xl px-4 py-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (onAccept) onAccept();
                onClose();
              }}
              className="bg-slate-800 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-black rounded-xl px-6 py-2.5 shadow-md shadow-slate-900/10 cursor-pointer transition-all active:scale-95"
            >
              I Understand
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
