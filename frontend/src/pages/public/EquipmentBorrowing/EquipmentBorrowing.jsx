import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PackageOpen, ShieldCheck, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KioskTimeline } from "@/components/ui/kiosk-timeline";
import api from "@/lib/axios";

import Step1Identity from "./components/Step1Identity";
import Step2Equipment from "./components/Step2Equipment";
import Step3Details from "./components/Step3Details";
import Step4Verification from "./components/Step4Verification";

const BORROW_STEPS = [
  { title: "Identity",          subtitle: "Requester role" },
  { title: "Equipment Catalog", subtitle: "Select AV items" },
  { title: "Fill Details",      subtitle: "Requisition form" },
  { title: "Verification",      subtitle: "Review & submit" },
];

export default function EquipmentBorrowing() {
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Selection States
  const [identity, setIdentity] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [equipmentCategory, setEquipmentCategory] = useState("all");
  const [showSuccess, setShowSuccess] = useState(false);

  // General Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [purpose, setPurpose] = useState("");
  const [placeOfUse, setPlaceOfUse] = useState("");
  const [handlerName, setHandlerName] = useState("");
  const [otp, setOtp]                           = useState("");
  const [isOtpSent, setIsOtpSent]               = useState(false);
  const [endorsementFile, setEndorsementFile]   = useState(null);
  const [referenceCode, setReferenceCode]       = useState("");
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [contactNumber, setContactNumber] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");

  const handleContactChange = (e) => {
    setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 11));
  };

  useEffect(() => {
    api.get('/public/equipment-types')
      .then(res => setCatalog(res.data ?? []))
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false));
  }, []);

  const filteredCatalog = equipmentCategory === "all"
    ? catalog
    : catalog.filter(c => c.dept === equipmentCategory);

  const isScoSelected = selectedItems.some(id => catalog.find(c => c.id === id)?.dept === "sco");
  const isAvrSelected = selectedItems.some(id => catalog.find(c => c.id === id)?.dept === "avr");
  const primaryDept = isScoSelected && !isAvrSelected ? "sco" : isAvrSelected && !isScoSelected ? "avr" : "mixed";

  const handleIdentitySelect = (id) => {
    setIdentity(id.toLowerCase());
    if (!completedSteps.includes(1)) setCompletedSteps([...completedSteps, 1]);
    setActiveStep(2);
  };

  const handleEquipmentToggle = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(i => i !== itemId) : [...prev, itemId]
    );
  };

  const handleEquipmentSubmit = () => {
    if (selectedItems.length > 0) {
      if (!completedSteps.includes(2)) setCompletedSteps([...completedSteps, 2]);
      setActiveStep(3);
    }
  };

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    if (!completedSteps.includes(3)) setCompletedSteps([...completedSteps, 3]);
    setActiveStep(4);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        requestor_name: fullName,
        requestor_email: email,
        requestor_contact_number: contactNumber,
        requestor_program_office: department || 'General',
        requestor_identity_type: identity.toLowerCase(),
        purpose: purpose + (primaryDept === 'sco' ? ` (Handler: ${handlerName})` : ''),
        place_of_use: placeOfUse,
        used_inside_campus: true,
        start_datetime: startTime + ":00", 
        end_datetime: endTime + ":00",
        contact_preference: 'email',
        items: selectedItems.map(id => ({
          equipment_type_id: id,
          quantity_requested: 1 
        }))
      };

      const endpoint = '/public/avr-equipment-borrowings';
      const { data } = await api.post(endpoint, payload);
      
      setReferenceCode(data.reference_code || 'REF-SUCCESS');
      setShowSuccess(true);
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(' ')
        : 'Network error. Please try again.';
      alert("Failed to submit request: " + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto relative animate-in fade-in slide-in-from-bottom-5 duration-700 pb-12">

      {/* Header Title */}
      <div className="text-center mb-8 w-full">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-3 shadow-xs">
          <PackageOpen size={14} className="text-amber-600" />
          <span>Equipment Requisition System</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
          Equipment Borrowing
        </h1>
        <p className="text-slate-500 font-medium max-w-md sm:max-w-lg mx-auto text-xs sm:text-sm leading-relaxed text-center">
          Request AV gear from AVR or professional video/audio broadcast equipment from SCO.
        </p>
      </div>

      {/* Horizontal Kiosk-Style Timeline Process Bar */}
      <KioskTimeline
        steps={BORROW_STEPS}
        activeStep={activeStep}
        onStepClick={(step) => setActiveStep(step)}
        completedSteps={completedSteps}
      />

      {/* Active Step Content Container */}
      <div className="w-full bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {activeStep === 1 && (
          <Step1Identity
            identity={identity}
            handleIdentitySelect={handleIdentitySelect}
            onNext={() => setActiveStep(2)}
          />
        )}

        {activeStep === 2 && (
          catalogLoading ? (
            <div className="p-10 text-center text-slate-400 text-xs font-semibold animate-pulse">
              Loading equipment catalog...
            </div>
          ) : (
            <Step2Equipment
              equipmentCategory={equipmentCategory}
              setEquipmentCategory={setEquipmentCategory}
              filteredCatalog={filteredCatalog}
              selectedItems={selectedItems}
              handleEquipmentToggle={handleEquipmentToggle}
              isScoSelected={isScoSelected}
              isAvrSelected={isAvrSelected}
              handleEquipmentSubmit={handleEquipmentSubmit}
              onBack={() => setActiveStep(1)}
            />
          )
        )}

        {activeStep === 3 && (
          <Step3Details
            primaryDept={primaryDept}
            selectedItems={selectedItems}
            handleDetailsSubmit={handleDetailsSubmit}
            fullName={fullName} setFullName={setFullName}
            email={email} setEmail={setEmail}
            contactNumber={contactNumber} handleContactChange={handleContactChange}
            startTime={startTime} setStartTime={setStartTime}
            department={department} setDepartment={setDepartment}
            endTime={endTime} setEndTime={setEndTime}
            placeOfUse={placeOfUse} setPlaceOfUse={setPlaceOfUse}
            handlerName={handlerName} setHandlerName={setHandlerName}
            purpose={purpose} setPurpose={setPurpose}
            onBack={() => setActiveStep(2)}
          />
        )}

        {activeStep === 4 && (
          <Step4Verification
            email={email}
            contactNumber={contactNumber}
            otp={otp} setOtp={setOtp}
            isOtpSent={isOtpSent} setIsOtpSent={setIsOtpSent}
            isSubmitting={isSubmitting} handleVerifySubmit={handleVerifySubmit}
            endorsementFile={endorsementFile} setEndorsementFile={setEndorsementFile}
            onBack={() => setActiveStep(3)}
          />
        )}
      </div>

      {/* Confirmation Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300 relative border border-slate-100">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-500/20 shadow-inner">
              <ShieldCheck size={42} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Request Submitted!</h2>
            <p className="text-slate-500 mb-6 font-medium text-xs leading-relaxed">
              Your equipment borrowing requisition has been submitted and queued for authorization.
            </p>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 shadow-inner">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Equipment Requisition Tracking Number</p>
              <p className="text-2xl font-black text-amber-600 tracking-wider font-mono">
                {referenceCode}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button className="w-full py-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                <Download size={18} />
                Download Requisition Slip (PDF)
              </Button>
              <Button asChild variant="outline" className="w-full py-6 rounded-xl border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50">
                <Link to="/track">Track Borrowing Status</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
