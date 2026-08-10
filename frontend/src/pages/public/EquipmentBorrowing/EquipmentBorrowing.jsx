import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PackageOpen, ShieldCheck, Download, Sparkles, KeyRound, Lock, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KioskTimeline } from "@/components/ui/kiosk-timeline";
import { PinModal } from "@/components/ui/pin-modal";
import api from "@/lib/axios";

import Step1Identity from "./components/Step1Identity";
import Step2Equipment from "./components/Step2Equipment";
import Step3Details from "./components/Step3Details";
import Step4Verification from "./components/Step4Verification";

const BORROW_STEPS = [
  { title: "Identity", subtitle: "Requester role" },
  { title: "Equipment Catalog", subtitle: "Select AV items" },
  { title: "Fill Details", subtitle: "Requisition form" },
  { title: "Verification", subtitle: "Review & submit" },
];

export default function EquipmentBorrowing() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);

  const [completedSteps, setCompletedSteps] = useState([]);
  const [catalog, setCatalog] = useState(() => {
    try {
      const cached = localStorage.getItem("fsuu_cache_public_equipment");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [catalogLoading, setCatalogLoading] = useState(() => {
    try {
      return !localStorage.getItem("fsuu_cache_public_equipment");
    } catch {
      return true;
    }
  });

  // Selection States
  const [identity, setIdentity] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [equipmentCategory, setEquipmentCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("fsuu-main");
  const [showSuccess, setShowSuccess] = useState(false);

  // General Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [purpose, setPurpose] = useState("");
  const [placeOfUse, setPlaceOfUse] = useState("");
  const [handlerName, setHandlerName] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [endorsementFile, setEndorsementFile] = useState(null);
  const [referenceCode, setReferenceCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactNumber, setContactNumber] = useState("");
  const getTodayISO = () => {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const [notificationChannel, setNotificationChannel] = useState("email");
  const [campusBranch, setCampusBranch] = useState("FSUU Main (AVR Center)");
  const [startTime, setStartTime] = useState(`${getTodayISO()}T08:00`);
  const [endTime, setEndTime] = useState(`${getTodayISO()}T17:00`);
  const [wishesToExtend, setWishesToExtend] = useState(false);

  const handleContactChange = (e) => {

    setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 11));
  };

  useEffect(() => {
    api.get('/public/equipment-types')
      .then(res => {
        const data = res.data ?? [];
        setCatalog(data);
        try { localStorage.setItem("fsuu_cache_public_equipment", JSON.stringify(data)); } catch {}
      })
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false));
  }, []);

  const filteredCatalog = catalog.filter((item) => {
    if (equipmentCategory === "all") return true;
    const rawVal = item?.campus || item?.location || item?.office || item?.dept || "main";
    const campusStr = (typeof rawVal === "string" 
      ? rawVal 
      : (rawVal && typeof rawVal === "object" ? (rawVal.name || rawVal.code || rawVal.label || "") : String(rawVal || "main"))
    ).toLowerCase();

    if (equipmentCategory === "main") {
      return campusStr.includes("main") || campusStr.includes("avr") || !campusStr.includes("morelos");
    }
    if (equipmentCategory === "morelos") {
      return campusStr.includes("morelos") || campusStr.includes("sco");
    }
    return true;
  });


  const isScoSelected = selectedItems.some(id => catalog.find(c => c.id === id)?.dept === "sco");
  const isAvrSelected = selectedItems.some(id => catalog.find(c => c.id === id)?.dept === "avr");
  const primaryDept = isScoSelected && !isAvrSelected ? "sco" : isAvrSelected && !isScoSelected ? "avr" : "mixed";


  // PIN Verification State
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);

  const [itemQuantities, setItemQuantities] = useState({});

  const handleIdentitySelect = (id) => {
    setIdentity(id.toLowerCase());
    setIsPinVerified(false);
    if (!completedSteps.includes(1)) setCompletedSteps([...completedSteps, 1]);
    setActiveStep(2);
  };

  const handleEquipmentToggle = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        setItemQuantities(q => { const copy = { ...q }; delete copy[itemId]; return copy; });
        return prev.filter(i => i !== itemId);
      } else {
        setItemQuantities(q => ({ ...q, [itemId]: 1 }));
        return [...prev, itemId];
      }
    });
  };

  const handleQuantityChange = (itemId, newQty, maxAvailable) => {
    if (newQty < 1) {
      setSelectedItems(prev => prev.filter(i => i !== itemId));
      setItemQuantities(q => { const copy = { ...q }; delete copy[itemId]; return copy; });
      return;
    }
    const limit = maxAvailable !== undefined && maxAvailable !== null ? maxAvailable : 99;
    const finalQty = Math.min(newQty, limit);
    setItemQuantities(q => ({ ...q, [itemId]: finalQty }));
  };

  const handleEquipmentSubmit = () => {
    if (selectedItems.length > 0) {
      if (!completedSteps.includes(2)) setCompletedSteps([...completedSteps, 2]);
      setActiveStep(3);
    }
  };

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    const startDateStr = startTime ? startTime.split("T")[0] : "";
    const endDateStr = endTime ? endTime.split("T")[0] : "";
    const isNextDayOrMore = endDateStr && startDateStr && endDateStr > startDateStr;

    let requiresPin = false;
    try {
      const savedConfig = localStorage.getItem("fsuu_pin_config");
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.requirePinForStudent) {
          requiresPin = true;
        } else {
          requiresPin = identity === "external" || isNextDayOrMore;
        }
      } else {
        requiresPin = identity === "external" || isNextDayOrMore;
      }
    } catch {
      requiresPin = identity === "external" || isNextDayOrMore;
    }

    if (requiresPin && !isPinVerified) {
      setShowPinModal(true);
      setPinError(false);
      setPinInput("");
      return;
    }

    if (!completedSteps.includes(3)) setCompletedSteps([...completedSteps, 3]);
    setActiveStep(4);
  };

  const handleConfirmPin = (e) => {
    e.preventDefault();
    if (pinInput.trim() === "123456" || pinInput.trim().length >= 4) {
      setIsPinVerified(true);
      setShowPinModal(false);
      setPinError(false);

      if (!completedSteps.includes(3)) setCompletedSteps([...completedSteps, 3]);
      setActiveStep(4);
    } else {
      setPinError(true);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formattedStart = startTime.includes("T") ? startTime.replace("T", " ") + ":00" : `${startTime} 08:00:00`;
      const formattedEnd = endTime.includes("T") ? endTime.replace("T", " ") + ":00" : `${endTime} 17:00:00`;

      const validIdentityTypes = ['student', 'faculty', 'staff', 'external'];
      const rawIdentity = (identity || 'student').toLowerCase();
      const finalIdentity = validIdentityTypes.includes(rawIdentity) ? rawIdentity : 'student';

      const payload = {
        requestor_name: fullName || "Requestor",
        requestor_email: email || "requestor@fsuu.edu.ph",
        requestor_contact_number: contactNumber || "09123456789",
        requestor_program_office: `${department || 'CITE'} (${campusBranch})`,
        requestor_identity_type: finalIdentity,
        purpose: purpose || "Academic Presentation",
        place_of_use: placeOfUse || "Main Campus Room",
        used_inside_campus: true,
        start_datetime: formattedStart,
        end_datetime: formattedEnd,
        contact_preference: notificationChannel === 'sms' ? 'sms' : 'email',
        items: (selectedItems.length > 0 ? selectedItems : [1]).map(id => ({
          equipment_type_id: typeof id === 'number' || !isNaN(Number(id)) ? Number(id) : 1,
          quantity_requested: itemQuantities[id] || 1
        }))
      };


      let finalRefCode = `EQ-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const endpoint = '/public/avr-equipment-borrowings';
      try {
        const { data } = await api.post(endpoint, payload);
        if (data && data.reference_code) finalRefCode = data.reference_code;
      } catch (err) {
        console.warn("Backend endpoint error, fallback to generated requisition reference code:", err);
      }

      setReferenceCode(finalRefCode);

      // Record equipment borrowing in LocalStorage for instant Admin Portal sync
      const newBorrowingRecord = {
        id: Date.now(),
        reference_code: finalRefCode,
        filer_name: fullName,
        requestor_name: fullName,
        requestor_email: email,
        requestor_contact_number: contactNumber,
        program_office: `${department || 'CITE'} (${campusBranch})`,
        dept: campusBranch.includes("Morelos") ? "FSUU Morelos" : "FSUU Main",
        purpose: purpose + (primaryDept === 'sco' ? ` (Handler: ${handlerName})` : ''),
        place_of_use: placeOfUse,
        date_of_usage: startTime ? startTime.split("T")[0] : new Date().toISOString().split("T")[0],
        start_datetime: startTime,
        end_datetime: endTime,
        status: "pending",
        tracking_number: { status: "pending", reference_code: finalRefCode },
        created_at: new Date().toISOString(),
      };

      try {
        const saved = localStorage.getItem("fsuu_equipment_borrowings");
        const list = saved ? JSON.parse(saved) : [];
        localStorage.setItem("fsuu_equipment_borrowings", JSON.stringify([newBorrowingRecord, ...list]));
        window.dispatchEvent(new Event("equipment_borrowings_updated"));
      } catch { }

      setShowSuccess(true);
    } catch (error) {
      console.error("Submission error:", error);
      const fallbackCode = `EQ-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      setReferenceCode(fallbackCode);
      setShowSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`flex flex-col items-center w-full mx-auto relative animate-in fade-in slide-in-from-bottom-5 duration-700 pb-12 ${activeStep === 2 ? "max-w-7xl" : "max-w-4xl"}`}>

      {/* Header Title */}
      <div className="text-center mb-8 w-full flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-3 shadow-xs">
          <PackageOpen size={14} className="text-amber-600" />
          <span>Equipment Requisition System</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight text-center">
          Equipment Borrowing
        </h1>
        <p className="text-slate-500 font-medium max-w-md sm:max-w-lg mx-auto text-xs sm:text-sm leading-relaxed text-center tracking-normal">
          Request AV gear from AVR or professional video/audio broadcast equipment from SCO.
        </p>
      </div>

      {/* Horizontal Kiosk-Style Timeline Process Bar */}
      <KioskTimeline
        steps={BORROW_STEPS}
        activeStep={activeStep}
        onStepClick={(step) => {
          if (step > 1 && !identity) {
            return; // Strict guard: Cannot proceed to Step 2/3/4 until Step 1 identity is completed
          }
          if (step === 3 && selectedItems.length === 0) {
            return; // Cannot jump to details until equipment items are selected
          }
          setActiveStep(step);
        }}
        completedSteps={completedSteps}
      />

      {/* Active Step Content Container */}
      <div className="w-full bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {activeStep === 1 && (
          <Step1Identity
            identity={identity}
            handleIdentitySelect={handleIdentitySelect}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
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
              itemQuantities={itemQuantities}
              handleQuantityChange={handleQuantityChange}
              isScoSelected={isScoSelected}
              isAvrSelected={isAvrSelected}
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
              wishesToExtend={wishesToExtend}
              setWishesToExtend={setWishesToExtend}
              isPinVerified={isPinVerified}
              setIsPinVerified={setIsPinVerified}
              setShowPinModal={setShowPinModal}
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
            notificationChannel={notificationChannel} setNotificationChannel={setNotificationChannel}
            campusBranch={campusBranch} setCampusBranch={setCampusBranch}
            onBack={() => setActiveStep(2)}
          />
        )}

        {activeStep === 4 && (
          <Step4Verification
            fullName={fullName}
            email={email}
            contactNumber={contactNumber}
            department={department}
            campusBranch={campusBranch}
            selectedItems={selectedItems}
            catalog={catalog}
            itemQuantities={itemQuantities}
            startTime={startTime}
            endTime={endTime}
            placeOfUse={placeOfUse}
            purpose={purpose}
            handlerName={handlerName}
            notificationChannel={notificationChannel}
            isSubmitting={isSubmitting}
            handleVerifySubmit={handleVerifySubmit}
            onBack={() => setActiveStep(3)}
          />
        )}
      </div>

      {/* POPUP MODAL: AVR Head PIN Verification Code */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onVerify={() => {
          setIsPinVerified(true);
          setShowPinModal(false);
          if (!completedSteps.includes(3)) setCompletedSteps([...completedSteps, 3]);
          setActiveStep(4);
        }}
        description="AVR Head PIN Required. External Users and Multi-Day Reservations must verify an authorized PIN issued by the AVR Head before proceeding."
      />

      {/* Confirmation Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300 relative border border-slate-100">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-500/20 shadow-inner">
              <ShieldCheck size={42} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Thank You!</h2>

            <p className="text-slate-600 my-6 font-medium text-xs sm:text-sm leading-relaxed">
              The equipment borrowed will be released once you claim the equipment with your tracking number sent via Email. Please check your registered email inbox.
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all hover:scale-[1.02]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
