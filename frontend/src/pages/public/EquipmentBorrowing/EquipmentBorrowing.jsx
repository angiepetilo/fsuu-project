import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown, ChevronUp, User, Users, GraduationCap, PackageOpen,
  UploadCloud, ShieldCheck, Download, Check, Sparkles, Camera,
  Video, Mic, Speaker, Tv, Sliders, Laptop, HelpCircle, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";

import StepHeader from "./components/StepHeader";
import Step1Identity from "./components/Step1Identity";
import Step2Equipment from "./components/Step2Equipment";
import Step3Details from "./components/Step3Details";
import Step4Verification from "./components/Step4Verification";

export default function EquipmentBorrowing() {
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Selection States
  const [identity, setIdentity] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [equipmentCategory, setEquipmentCategory] = useState("all"); // 'all', 'avr', 'sco'
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
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

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

  // Determine dominant equipment department (avr vs sco)
  const isScoSelected = selectedItems.some(id => catalog.find(c => c.id === id)?.dept === "sco");
  const isAvrSelected = selectedItems.some(id => catalog.find(c => c.id === id)?.dept === "avr");

  const primaryDept = isScoSelected && !isAvrSelected ? "sco" : isAvrSelected && !isScoSelected ? "avr" : "mixed";

  const toggleStep = (step) => {
    if (completedSteps.includes(step - 1) || step === 1) {
      setActiveStep(activeStep === step ? null : step);
    }
  };

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

  // OTP handled inside Step4Verification component directly
  const handleSendOtp = () => setIsOtpSent(true); // unused stub

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

// StepHeader component moved to separate file

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto relative animate-in fade-in slide-in-from-bottom-5 duration-700 pb-12">

      {/* Background aura */}
      <div className="absolute top-[-5%] left-[20%] w-[500px] h-[500px] bg-gradient-to-tr from-amber-400/15 via-blue-400/10 to-indigo-300/10 rounded-full blur-3xl z-[-1] pointer-events-none"></div>

      {/* Header Title */}
      <div className="text-center mb-10 w-full">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-4 shadow-sm">
          <PackageOpen size={14} className="text-amber-600" />
          <span>Equipment Requisition System</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">
          Equipment Borrowing
        </h1>
        <p className="text-slate-500 font-medium max-w-xl mx-auto text-sm sm:text-base leading-relaxed text-center block w-full">
          Request AV gear from AVR or professional video/audio broadcast equipment from SCO.
        </p>
      </div>

      <div className="w-full flex flex-col gap-6 relative z-10">

        {/* STEP 1: Identity Selection */}
        <div className={`bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-sm transition-all overflow-hidden ${activeStep === 1 ? 'ring-2 ring-blue-600/20 shadow-md' : ''}`}>
          <StepHeader 
            stepNum={1} 
            title="Identity Selection" 
            subtitle="Choose requester classification" 
            activeStep={activeStep}
            completedSteps={completedSteps}
            toggleStep={toggleStep}
          />

          {activeStep === 1 && (
            <Step1Identity 
              identity={identity} 
              handleIdentitySelect={handleIdentitySelect} 
            />
          )}
        </div>

        {/* STEP 2: Equipment Selection */}
        <div className={`bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-sm transition-all overflow-hidden ${activeStep === 2 ? 'ring-2 ring-blue-600/20 shadow-md' : ''}`}>
          <StepHeader 
            stepNum={2} 
            title="Equipment Catalog Selection" 
            subtitle="Select AV items or SCO Media broadcast equipment" 
            activeStep={activeStep}
            completedSteps={completedSteps}
            toggleStep={toggleStep}
          />

          {activeStep === 2 && (
            catalogLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
                Loading equipment catalog…
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
              />
            )
          )}
        </div>

        {/* STEP 3: Dynamic Fill Details (AVR vs SCO Equipment Forms) */}
        <div className={`bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-sm transition-all overflow-hidden ${activeStep === 3 ? 'ring-2 ring-blue-600/20 shadow-md' : ''}`}>
          <StepHeader
            stepNum={3}
            title={primaryDept === "sco" ? "SCO Media Equipment Borrowing Form" : "AVR Equipment Requisition Form"}
            subtitle="Specify event venue location, transport details, and return timeframe"
            activeStep={activeStep}
            completedSteps={completedSteps}
            toggleStep={toggleStep}
          />

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
            />
          )}
        </div>

        {/* STEP 4: Requirements & Verification */}
        <div className={`bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-sm transition-all overflow-hidden ${activeStep === 4 ? 'ring-2 ring-blue-600/20 shadow-md' : ''}`}>
          <StepHeader 
            stepNum={4} 
            title="Requirements & Security Verification" 
            subtitle="Upload borrower ID or endorsement and verify email" 
            activeStep={activeStep}
            completedSteps={completedSteps}
            toggleStep={toggleStep}
          />

          {activeStep === 4 && (
            <Step4Verification 
              email={email}
              contactNumber={contactNumber}
              otp={otp} setOtp={setOtp}
              isOtpSent={isOtpSent} setIsOtpSent={setIsOtpSent}
              isSubmitting={isSubmitting} handleVerifySubmit={handleVerifySubmit}
              endorsementFile={endorsementFile} setEndorsementFile={setEndorsementFile}
            />
          )}
        </div>
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
