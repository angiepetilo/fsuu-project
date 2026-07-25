import { Link } from "react-router-dom";
import { Info, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import Hero from "./components/Hero";
import FeatureCards from "./components/FeatureCards";
import { AppCard } from "@/components/ui/app-card";

export default function LandingPage() {
  return (
    <div className="w-full text-slate-900 font-sans relative space-y-12">

      {/* Hero Section */}
      <Hero />

      {/* Choice Cards Grid */}
      <FeatureCards />

      {/* Booking Requirements Segment using AppCard */}
      <AppCard className="p-6 sm:p-10 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
          <FileText size={22} className="text-blue-600 shrink-0" />
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Booking Requirements &amp; Guidelines
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Standard endorsement letters required for venue &amp; equipment reservation approval
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50/70 border border-slate-200/80 p-6 rounded-xl space-y-3">
            <div className="flex items-start gap-3">
              <FileText size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Student Organization Purposes
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Formal request letter signed and endorsed by the Dean of Student Affairs (DSA).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/60 w-fit">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>DSA Approval Required</span>
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-200/80 p-6 rounded-xl space-y-3">
            <div className="flex items-start gap-3">
              <FileText size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Academic &amp; Departmental Purposes
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Formal request letter signed and endorsed by the VP for Academic Affairs (VP Acad).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/60 w-fit">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>VP Acad Approval Required</span>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-800 leading-relaxed font-medium flex items-center gap-3">
          <Info size={20} className="text-blue-600 shrink-0" />
          <div>
            <strong className="font-extrabold">External Users Notice:</strong> Payment scheduling and transaction details will be finalized only after the request receives administrative approval.
          </div>
        </div>
      </AppCard>

      {/* Footer Staff Portal Link */}
      <div className="flex items-center justify-center gap-2 pt-4 pb-8 text-xs font-extrabold text-slate-400">
        <span>•</span>
        <Link to="/login" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
          <ShieldCheck size={14} className="text-amber-500" />
          <span>Administrative Staff Portal</span>
        </Link>
      </div>

    </div>
  );
}
