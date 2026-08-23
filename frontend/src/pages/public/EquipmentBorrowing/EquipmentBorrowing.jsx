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

import { isPastDateTime } from "@/lib/dateTimeUtils";

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
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Operating Hours & PIN Rules
  const [opHours, setOpHours] = useState(null);
  const [pinRules, setPinRules] = useState(null);
  const [pinModalMeta, setPinModalMeta] = useState({
    title: "Verification PIN Required",
    description: "AVR Head PIN Required",
  });

  // Clean public equipment localStorage items on mount
  useEffect(() => {
    try {
      localStorage.removeItem("fsuu_cache_public_equipment");
      localStorage.removeItem("fsuu_equipment_borrowings");
    } catch {}
  }, []);

  // Fetch Operating Hours & PIN Settings
  useEffect(() => {
    api.get("/public/operating-hours")
      .catch(() => api.get("/admin/operating-hours"))
      .then(res => {
        if (res?.data) setOpHours(res.data);
      })
      .catch(() => {});

    api.get("/public/verification-pin-settings")
      .then(res => {
        if (res?.data) setPinRules(res.data);
      })
      .catch(() => {});
  }, []);

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
    const startDateStr = startTime ? startTime.split("T")[0] : "";
    const startTimeStr = startTime && startTime.includes("T") ? startTime.split("T")[1].slice(0, 5) : "";
    const endDateStr = endTime ? endTime.split("T")[0] : "";
    const endTimeStr = endTime && endTime.includes("T") ? endTime.split("T")[1].slice(0, 5) : "";

    const selectedOfficeId = (campusBranch || "").toLowerCase().includes("morelos") ? 2 : 1;

    const params = new URLSearchParams();
    params.append("office_id", selectedOfficeId);
    if (startDateStr) params.append("date", startDateStr);
    if (startTimeStr) params.append("time_start", startTimeStr);
    if (endTimeStr) params.append("time_end", endTimeStr);

    setCatalogLoading(true);
    api.get(`/public/equipment-types?${params.toString()}`)
      .then(res => {
        const data = res.data ?? [];
        setCatalog(data);
      })
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false));
  }, [startTime, endTime, campusBranch]);

  const uniqueCategories = ["all", ...new Set(catalog.map(c => c.eq_type || c.category).filter(Boolean))];

  const filteredCatalog = catalog.filter((item) => {
    if (equipmentCategory === "all") return true;
    
    const cat = (item.eq_type || item.category || "").toLowerCase();
    const query = (equipmentCategory || "").toLowerCase();
    
    return cat === query || cat.includes(query) || (item.name || "").toLowerCase().includes(query) || (item.eq_name || "").toLowerCase().includes(query);
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

  const formatTime12 = (tStr) => {
    if (!tStr) return "";
    const [h, m] = tStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  };

  const handleIdentitySelect = (id) => {
    const norm = (id || "").toLowerCase();
    setIdentity(norm);

    const isSystemPinActive = pinRules?.isEnabled === true || (pinRules?.isEnabled !== false && pinRules?.isEnabled !== "false");
    const externalRequiresPin = isSystemPinActive && (pinRules?.enableExternalEquipment === true || (pinRules?.enableExternalEquipment !== false && pinRules?.enableExternalEquipment !== "false")) && norm === "external";

    if (externalRequiresPin && !isPinVerified) {
      setPinModalMeta({
        title: "External Requisition PIN",
        description: "Requisitions filed under External Identity require AVR Head / Admin authorization PIN to proceed.",
      });
      setShowPinModal(true);
      return;
    }

    if (norm !== "external") {
      setIsPinVerified(false);
    }
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
    const startDateStr = startTime ? startTime.split("T")[0] : "";
    const startTimeStr = startTime && startTime.includes("T") ? startTime.split("T")[1].slice(0, 5) : "08:00";
    const endDateStr = endTime ? endTime.split("T")[0] : "";
    const endTimeStr = endTime && endTime.includes("T") ? endTime.split("T")[1].slice(0, 5) : "17:00";

    if (isPastDateTime(startDateStr, startTimeStr)) {
      alert("Selected borrow date or time has already passed. Please select a future date and time.");
      return;
    }

    if (selectedItems.length === 0) {
      alert("Please select at least one equipment item to borrow.");
      return;
    }

    const kioskOpen = opHours?.equipment_open?.substring(0, 5) || "08:00";
    const kioskClose = opHours?.equipment_close?.substring(0, 5) || "17:00";
    const isOutsideHours = startTimeStr < kioskOpen || endTimeStr > kioskClose;
    
    let diffDays = 0;
    if (endDateStr && startDateStr && endDateStr > startDateStr) {
      const startD = new Date(startDateStr);
      const endD = new Date(endDateStr);
      const diffTime = endD - startD;
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    // More than 1 day (spans 2 or more days)
    // Evaluate trigger rules accurately based on checked/unchecked settings
    const isSystemPinActive = pinRules?.isEnabled === true || (pinRules?.isEnabled !== false && pinRules?.isEnabled !== "false");
    const outsideRequiresPin = (pinRules?.requirePinOutsideHours === true || (pinRules?.requirePinOutsideHours !== false && pinRules?.requirePinOutsideHours !== "false")) && isOutsideHours;
    const externalRequiresPin = (pinRules?.enableExternalEquipment === true || (pinRules?.enableExternalEquipment !== false && pinRules?.enableExternalEquipment !== "false")) && identity === "external";
    const studentMandatory = pinRules?.requirePinForStudent === true || pinRules?.pinMode === "required";

    const requiresPin = isSystemPinActive && (
      outsideRequiresPin || externalRequiresPin || studentMandatory
    );

    if (requiresPin && !isPinVerified) {
      if (outsideRequiresPin) {
        setPinModalMeta({
          title: "Outside Office Hours PIN",
          description: `Selected borrowing/return time (${formatTime12(startTimeStr)} - ${formatTime12(endTimeStr)}) is outside official campus kiosk hours (${formatTime12(kioskOpen)} - ${formatTime12(kioskClose)}). AVR Head / Admin Verification PIN is required for authorization.`,
        });
      } else if (externalRequiresPin) {
        setPinModalMeta({
          title: "External Requisition PIN",
          description: "Requisitions filed under External Identity require AVR Head / Admin authorization PIN.",
        });
      } else {
        setPinModalMeta({
          title: "Authorization PIN",
          description: "This equipment requisition requires AVR Head / Admin Verification PIN for authorization.",
        });
      }

      setShowPinModal(true);
      setPinError(false);
      setPinInput("");
      return;
    }

    if (!completedSteps.includes(2)) setCompletedSteps([...completedSteps, 2]);
    setActiveStep(3);
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
      const getFormattedDT = (dtStr, fallbackTime) => {
        if (!dtStr) return `${getTodayISO()} ${fallbackTime}:00`;
        let s = dtStr.replace("T", " ");
        if (s.length === 16) s += ":00";
        return s;
      };

      const startDT = getFormattedDT(startTime, "08:00");
      const endDT = getFormattedDT(endTime, "17:00");

      const selectedOfficeId = (campusBranch || "").toLowerCase().includes("morelos") ? 2 : 1;

      const itemsList = selectedItems.map((id) => ({
        equipment_type_id: id,
        quantity_requested: itemQuantities[id] || 1,
      }));

      const payload = {
        office_id: selectedOfficeId,
        requestor_name: fullName,
        requestor_email: email,
        requestor_contact_number: contactNumber,
        requestor_program_office: department,
        requestor_identity_type: identity || 'student',
        purpose: purpose,
        purpose_description: purpose,
        place_of_use: placeOfUse || "Campus Facility",
        handler_name: handlerName || fullName,
        start_datetime: startDT,
        end_datetime: endDT,
        expected_return_datetime: endDT,
        borrow_date: startDT.split(" ")[0],
        intended_return_date: endDT.split(" ")[0],
        borrow_time: startDT.split(" ")[1]?.substring(0, 5) || "08:00",
        intended_return_time: endDT.split(" ")[1]?.substring(0, 5) || "17:00",
        used_inside_campus: 1,
        contact_preference: notificationChannel || "email",
        equipment_items: JSON.stringify(itemsList),
      };

      const formData = new FormData();
      Object.keys(payload).forEach((key) => {
        if (payload[key] !== undefined && payload[key] !== null) {
          formData.append(key, payload[key]);
        }
      });
      itemsList.forEach((item, idx) => {
        formData.append(`items[${idx}][equipment_type_id]`, item.equipment_type_id);
        formData.append(`items[${idx}][quantity_requested]`, item.quantity_requested);
      });
      if (endorsementFile) {
        const fileToAppend = endorsementFile instanceof File ? endorsementFile : (endorsementFile?.file instanceof File ? endorsementFile.file : endorsementFile);
        if (fileToAppend) {
          formData.append("endorsement_file", fileToAppend);
        }
      }

      const res = await api.post("/public/avr-equipment-borrowings", formData);

      const rawTracking = res.data?.tracking_number;
      const trackingNum = (typeof rawTracking === 'string' ? rawTracking : rawTracking?.reference_code || rawTracking?.tracking_number)
        || res.data?.reference_code
        || (res.data?.id ? `TRK-EB-${res.data.id}` : 'FSUU-REQ-PENDING');

      setReferenceCode(trackingNum);
      setShowSuccess(true);
    } catch (err) {
      alert(err.response?.data?.message || "Submission failed. Please check form details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 4-Step Timeline Component */}
      <div className="w-full max-w-4xl mb-6">
        <KioskTimeline
          steps={BORROW_STEPS}
          currentStep={activeStep}
          completedSteps={completedSteps}
        />
      </div>

      <div className="w-full max-w-5xl">
        {activeStep === 1 && (
          <Step1Identity
            selectedIdentity={identity}
            onSelectIdentity={handleIdentitySelect}
            onNext={() => handleIdentitySelect(identity)}
          />
        )}

        {activeStep === 2 && (
          <Step2Equipment
            identity={identity}
            equipmentCategory={equipmentCategory}
            setEquipmentCategory={setEquipmentCategory}
            uniqueCategories={uniqueCategories}
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
            setPinModalMeta={setPinModalMeta}
            opHours={opHours}
            pinRules={pinRules}
            handleEquipmentSubmit={handleEquipmentSubmit}
            onBack={() => setActiveStep(1)}
            catalogLoading={catalogLoading}
          />
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
          if (activeStep === 1) {
            if (!completedSteps.includes(1)) setCompletedSteps((prev) => [...prev, 1]);
            setActiveStep(2);
          } else if (activeStep === 2) {
            if (!completedSteps.includes(2)) setCompletedSteps((prev) => [...prev, 2]);
            setActiveStep(3);
          }
        }}
        title={pinModalMeta.title}
        description={pinModalMeta.description}
      />

      {/* Confirmation Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300 relative border border-slate-100 space-y-4">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/20 shadow-inner">
              <ShieldCheck size={42} />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Request Submitted!</h2>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5 text-center">
              <p className="text-xs font-bold text-slate-800">
                Your equipment borrowing request has been received.
              </p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Your tracking details and updates have been sent to {email ? <strong>{email}</strong> : 'your email'}{contactNumber ? ` and ${contactNumber}` : ''}.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-extrabold shadow-lg transition-all text-center"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
