import React from "react";
import { Mail, X, CheckCircle2, Loader2, Send } from "lucide-react";

export default function SendEmailModal({
  open,
  onClose,
  tabLabel,
  officeScope,
  recipientEmail,
  setRecipientEmail,
  emailSubject,
  setEmailSubject,
  emailNotes,
  setEmailNotes,
  sendingEmail,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Mail size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Send Report via Email</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Recipient Email Address(es) <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. dean.cite@urios.edu.ph, admin@urios.edu.ph"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Enter the recipient's institutional email address.
            </p>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Subject</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Remarks</label>
            <textarea
              rows={3}
              value={emailNotes}
              onChange={(e) => setEmailNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl text-[11px] font-semibold text-blue-900 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
            <span>The complete {tabLabel} dataset will be attached as a formatted audit report.</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendingEmail}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{sendingEmail ? "Dispatching..." : "Send Report"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
