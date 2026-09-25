import { Link } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader2, FileText, Download } from "lucide-react";
import api from "@/lib/axios";
import Hero from "./components/Hero";
import FeatureCards from "./components/FeatureCards";
import EndorsementLetterTemplateModal from "@/components/ui/EndorsementLetterTemplateModal";

export default function LandingPage() {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateType, setSelectedTemplateType] = useState("organization");
  const [selectedTemplateRequirement, setSelectedTemplateRequirement] = useState(null);

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

  const uniqueRequirements = useMemo(() => {
    const seen = new Set();
    return requirements.filter((req) => {
      const key = req.label?.trim()?.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [requirements]);

  const handleOpenTemplate = useCallback((req) => {
    setSelectedTemplateRequirement(req);
    setSelectedTemplateType(req.classification || "organization");
    setShowTemplateModal(true);
  }, []);

  return (
    <div className="w-full text-foreground relative">

      {/* Hero Section */}
      <Hero />

      {/* Choice Cards Grid */}
      <FeatureCards />

      {/* Booking Requirements Section */}
      <section className="bg-card border border-border rounded-lg p-4 sm:p-5 mb-6 transition-colors">
        <div className="mb-3">
          <h2 className="text-sm font-medium text-foreground">
            Requirements Needed Before Venue Booking
          </h2>
          <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
            Endorsement letter format and signatory clearance.
          </p>
        </div>

        {loading ? (
          <div className="py-4 text-center text-muted-foreground text-[11px] font-normal">
            <Loader2 className="animate-spin inline mr-2" size={13} /> Loading booking requirements...
          </div>
        ) : uniqueRequirements.length === 0 ? (
          <div className="bg-muted/30 border border-border p-3 rounded-md text-center text-[11px] text-muted-foreground font-normal">
            No specific venue booking requirements configured.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {uniqueRequirements.map((req, idx) => {
              const isAcad = String(req.classification || "").toLowerCase().includes("acad");
              const mode = req.template_display_mode || (req.template_file_url ? "both" : "digital_format");
              const showUploaded = (mode === "uploaded_file" || mode === "both") && Boolean(req.template_file_url);
              const showDigital = (mode === "digital_format" || mode === "both") || !req.template_file_url;

              return (
                <div key={req.id || idx} className="bg-card border border-border p-3 rounded-md flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-normal text-muted-foreground bg-muted border border-border/60 px-1.5 py-0.5 rounded capitalize">
                        {req.classification || "General Requirement"}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-foreground mb-0.5 leading-snug">
                      {req.label}
                    </p>

                    {req.description && (
                      <p className="text-[11px] text-muted-foreground font-normal leading-relaxed">
                        {req.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-border flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <span className="text-[10px] font-normal text-muted-foreground">
                      Signatures: Dean, {isAcad ? "OVPASA" : "OISAA"}, PMO
                    </span>
                    <div className="flex items-center gap-1.5">
                      {showUploaded && (
                        <a
                          href={req.template_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="flex items-center gap-1 px-2 py-1 bg-muted/60 hover:bg-muted text-foreground border border-border rounded text-[11px] font-normal transition-colors"
                          title={req.template_file_name || "Download Template File"}
                        >
                          <Download size={11} className="text-muted-foreground" />
                          <span>Download</span>
                        </a>
                      )}
                      {showDigital && (
                        <button
                          type="button"
                          onClick={() => handleOpenTemplate(req)}
                          className="flex items-center gap-1 px-2 py-1 bg-card hover:bg-muted text-foreground border border-border rounded text-[11px] font-normal transition-colors cursor-pointer"
                        >
                          <FileText size={11} className="text-muted-foreground" />
                          <span>View Format</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Important Payment Notice */}
        <div className="mt-3 p-2.5 bg-muted/30 border border-border rounded-md text-[11px] text-muted-foreground font-normal leading-relaxed">
          <span className="font-medium text-foreground">Important Payment Notice for external users:</span> Payment scheduling and transaction details will be finalized only after the request receives administrative approval.
        </div>
      </section>


      {/* Endorsement Letter Format Preview Modal */}
      <EndorsementLetterTemplateModal
        isOpen={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false);
          setSelectedTemplateRequirement(null);
        }}
        requirement={selectedTemplateRequirement}
        initialType={selectedTemplateType}
        allowEdit={false}
        showTypeTabs={false}
      />

      {/* Action Links Below Requirements Card */}
      <div className="flex items-center justify-center gap-6 my-8 text-xs font-medium text-muted-foreground">
        <Link
          to="/login"
          className="flex items-center gap-2 hover:text-foreground transition-colors group py-2 px-3 rounded-lg min-h-[44px]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-125 transition-transform" />
          <span>Authorized Users</span>
        </Link>
      </div>

    </div>
  );
}
