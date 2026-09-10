import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader2, FileText } from "lucide-react";
import api from "@/lib/axios";
import Hero from "./components/Hero";
import FeatureCards from "./components/FeatureCards";
import EndorsementLetterTemplateModal from "@/components/ui/EndorsementLetterTemplateModal";

export default function LandingPage() {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateType, setSelectedTemplateType] = useState("organization");

  useEffect(() => {
    api.get("/public/booking-requirements")
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setRequirements(data);
      })
      .catch(() => {
        api.get("/general/booking-requirements")
          .then((res) => setRequirements(Array.isArray(res.data) ? res.data : []))
          .catch(() => setRequirements([]));
      })
      .finally(() => setLoading(false));
  }, []);

  const uniqueRequirements = requirements.filter(
    (req, idx, arr) => arr.findIndex((r) => r.label?.trim()?.toLowerCase() === req.label?.trim()?.toLowerCase()) === idx
  );

  const handleOpenTemplate = (classification) => {
    const isAcad = String(classification || "").toLowerCase().includes("acad");
    setSelectedTemplateType(isAcad ? "academic" : "organization");
    setShowTemplateModal(true);
  };

  return (
    <div className="w-full text-foreground relative">

      {/* Hero Section */}
      <Hero />

      {/* Choice Cards Grid */}
      <FeatureCards />

      {/* Booking Requirements Section */}
      <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 mb-10 shadow-xs relative overflow-hidden transition-colors">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />

        <div className="mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            Requirements Needed Before Venue Booking
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-normal mt-1">
            Review official endorsement letter structures and signatory clearance requirements.
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-xs font-medium">
            <Loader2 className="animate-spin inline mr-2" size={16} /> Loading booking requirements...
          </div>
        ) : uniqueRequirements.length === 0 ? (
          <div className="bg-muted/40 border border-border p-5 rounded-xl text-center text-xs text-muted-foreground font-medium">
            No specific venue booking requirements configured.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {uniqueRequirements.map((req, idx) => {
              const isAcad = String(req.classification || "").toLowerCase().includes("acad");
              return (
                <div key={req.id || idx} className="bg-muted/30 border border-border/80 p-5 rounded-xl transition-all duration-200 hover:border-border flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 inline-block px-2.5 py-0.5 rounded-md capitalize">
                        {req.classification || "General Requirement"}
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-foreground mb-1.5 leading-snug">
                      {req.label}
                    </p>

                    {req.description && (
                      <p className="text-xs text-muted-foreground font-normal">
                        {req.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-normal text-muted-foreground">
                      Signatures: Dean, {isAcad ? "OVPASA" : "OISAA"}, PMO
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenTemplate(req.classification)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer min-h-[36px]"
                    >
                      <FileText size={13} className="text-primary" />
                      <span>View Format</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Important Payment Notice */}
        <div className="mt-6 p-4 bg-primary/10 border-l-4 border-primary rounded-r-xl text-xs text-foreground font-normal leading-relaxed">
          <span className="font-semibold text-foreground">Important Payment Notice for external users:</span> Payment scheduling and transaction details will be finalized only after the request receives administrative approval.
        </div>
      </section>

      {/* Endorsement Letter Format Preview Modal */}
      <EndorsementLetterTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        initialType={selectedTemplateType}
      />

      {/* Action Links Below Requirements Card */}
      <div className="flex items-center justify-center gap-6 my-8 text-xs font-medium text-muted-foreground">
        <Link
          to="/login"
          className="flex items-center gap-2 hover:text-foreground transition-colors group py-2 px-3 rounded-lg min-h-[44px]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-125 transition-transform" />
          <span>Staff & Administrative Access</span>
        </Link>
      </div>

    </div>
  );
}
