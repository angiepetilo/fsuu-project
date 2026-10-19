import { useState } from "react";
import { X, Phone, Mail, MapPin, Clock, Copy, Check, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactUsModal({ isOpen, onClose, contactSettings = {} }) {
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen) return null;

  const officeName = contactSettings.office_name || "Audio-Visual Resource Center (AVRC)";
  const officeAddress = contactSettings.office_address || "Main Campus, Father Saturnino Urios University\nSan Francisco Street, Butuan City, Agusan del Norte, 8600";
  const operatingHours = contactSettings.operating_hours || "Monday – Friday: 7:30 AM – 5:00 PM\nSaturday: 8:00 AM – 12:00 PM\nSunday & University Holidays: Closed";
  const email = contactSettings.contact_email || "angie.petilo@urios.edu.ph";
  const phone = contactSettings.contact_phone || "(085) 342-1830";
  const facebookUrl = contactSettings.facebook_url || "https://www.facebook.com/fsuubutuan";
  const facebookName = contactSettings.facebook_name || "Father Saturnino Urios University";

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-lg flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Plain Clean Header */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-900/40">
              <Phone size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Contact Us
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

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-3.5 bg-slate-100/70 dark:bg-slate-950/60 max-h-[75vh] overflow-y-auto">
          
          {/* Card 1: Office & Campus Location */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-4 rounded-full bg-amber-500 shrink-0" />
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Office &amp; Campus Location
              </h3>
            </div>
            <div className="flex items-start gap-3 pl-3.5 pt-1">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200/60 dark:border-blue-900/40">
                <MapPin size={16} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {officeName}
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed whitespace-pre-line">
                  {officeAddress}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Direct Contact Channels */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-4 rounded-full bg-amber-500 shrink-0" />
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Direct Contact Directory
              </h3>
            </div>

            <div className="space-y-2.5 pl-3.5 pt-1">
              {/* Telephone */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Phone size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Telephone / Trunkline</span>
                    <a href={`tel:${phone}`} className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {phone}
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(phone, "phone")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Copy Phone Number"
                >
                  {copiedField === "phone" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Mail size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Official Email</span>
                    <a href={`mailto:${email}`} className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block max-w-[210px] sm:max-w-[260px]">
                      {email}
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(email, "email")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Copy Email Address"
                >
                  {copiedField === "email" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Facebook */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1877F2] flex items-center justify-center shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Facebook Page</span>
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block max-w-[210px] sm:max-w-[260px]"
                    >
                      {facebookName}
                    </a>
                  </div>
                </div>
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-1 cursor-pointer"
                >
                  Visit →
                </a>
              </div>
            </div>
          </div>

          {/* Card 3: Operating Hours */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-4 rounded-full bg-amber-500 shrink-0" />
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Operating Hours
              </h3>
            </div>
            <div className="flex items-start gap-3 pl-3.5 pt-1">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200/60 dark:border-amber-900/40">
                <Clock size={16} />
              </div>
              <div className="text-xs space-y-1 font-medium text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {operatingHours}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 sm:px-7 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden sm:block">
            Father Saturnino Urios University
          </p>
          <Button
            type="button"
            onClick={onClose}
            className="ml-auto bg-slate-800 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-black rounded-xl px-5 py-2 cursor-pointer shadow-xs"
          >
            Close
          </Button>
        </div>

      </div>
    </div>
  );
}
