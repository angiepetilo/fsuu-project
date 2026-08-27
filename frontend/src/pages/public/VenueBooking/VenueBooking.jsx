import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, KeyRound, Lock, X, AlertCircle, ShieldCheck, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KioskTimeline } from "@/components/ui/kiosk-timeline";
import { PinModal } from "@/components/ui/pin-modal";
import api from "@/lib/axios";

import Step1Identity from "./components/Step1Identity";
import Step2Venue from "./components/Step2Venue";
import Step3Details from "./components/Step3Details";
import Step4Verification from "./components/Step4Verification";

import { isPastDateTime } from "@/lib/dateTimeUtils";
import { useAuth } from "@/context/AuthContext";

const VENUE_STEPS = [
  { title: "SELECT ROLE", subtitle: "Select role" },
  { title: "DATE & TIME", subtitle: "Choose venue & schedule" },
  { title: "FILL DETAILS", subtitle: "Reservation form" },
  { title: "UPLOAD & SUBMIT", subtitle: "Upload & submit" },
];

export default function VenueBooking({ isPortal: isPortalProp }) {
  const { user, token } = useAuth();
  const isAuthenticated = Boolean(user || token);
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);

  const isPortal = isAuthenticated && (isPortalProp ?? (
    typeof window !== "undefined" && (
      window.location.pathname.startsWith("/interface") ||
      window.location.pathname.startsWith("/admin") ||
      window.location.pathname.startsWith("/sysad") ||
      window.location.search.includes("portal=true")
    )
  ));

  // Operating Hours & PIN Rules
  const [opHours, setOpHours] = useState(null);
  const [pinRules, setPinRules] = useState(null);
  const [pinModalMeta, setPinModalMeta] = useState({
    title: "Verification PIN Required",
    description: "AVR Head / Admin PIN Required",
  });

  // Clean public venue localStorage items on mount
  useEffect(() => {
    try {
      localStorage.removeItem("fsuu_cache_public_venues");
      localStorage.removeItem("fsuu_venue_availability");
      localStorage.removeItem("fsuu_venue_bookings");
    } catch {}
  }, []);

  // Form & Selection States
  const [identity, setIdentity] = useState("");
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [venueCategory, setVenueCategory] = useState("all");
  const [referenceCode, setReferenceCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // General Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [purpose, setPurpose] = useState("");
  const [endorsementFile, setEndorsementFile] = useState(null);

  // AVR Specific Fields
  const [classification, setClassification] = useState("");
  const [persons, setPersons] = useState("");
  const [avrEquipment, setAvrEquipment] = useState({ mic: false, proj: false, sound: false, podium: false });
  const [equipmentRemarks, setEquipmentRemarks] = useState("");

  // PIN Verification State
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);

  // Time Range States
  const [contactNumber, setContactNumber] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [existingBookings, setExistingBookings] = useState([]);
  const [equipmentCatalog, setEquipmentCatalog] = useState([]);

  useEffect(() => {
    // Fetch operating hours
    api.get("/public/operating-hours")
      .then(res => {
        if (res?.data) setOpHours(res.data);
      })
      .catch(() => {});

    // Fetch verification pin rules
    api.get("/public/verification-pin-settings")
      .then(res => {
        if (res?.data) setPinRules(res.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedDate) params.append("date", selectedDate);
    if (startTime) params.append("time_start", startTime);
    if (endTime) params.append("time_end", endTime);

    api.get(`/public/equipment-types?${params.toString()}`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setEquipmentCatalog(list);
      })
      .catch(() => setEquipmentCatalog([]));
  }, [selectedDate, startTime, endTime]);

  const handleContactChange = (e) => {
    setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 11));
  };

  const formatVenues = (apiVenues = []) => {
    return apiVenues.map(v => {
      const avatarPhoto = v.avatar || v.photo || v.image || v.avatar_url || v.photo_url || null;
      let allowed = v.allowed_equipment;
      if (typeof allowed === "string") {
        try { allowed = JSON.parse(allowed); } catch { allowed = []; }
      }
      let maxQtys = v.equipment_max_qtys;
      if (typeof maxQtys === "string") {
        try { maxQtys = JSON.parse(maxQtys); } catch { maxQtys = {}; }
      }
      return {
        id: v.id,
        name: v.name,
        type: v.type || "avr",
        capacity: v.capacity,
        photo: avatarPhoto,
        location: v.location || (v.office ? v.office.name : "Main Campus"),
        status: v.status || "available",
        allowed_equipment: Array.isArray(allowed) ? allowed : [],
        equipment_max_qtys: maxQtys || {},
        operating_hours: v.operating_hours || (v.time_open && v.time_close ? `${v.time_open} - ${v.time_close}` : "07:30 - 17:00"),
        rate_per_hour: v.rate_per_hour || (v.type === "avr" ? 500 : 300),
        schedule: v.schedule || (v.time_open && v.time_close ? `Mon - Sat (${v.time_open} - ${v.time_close})` : "Mon - Sat (7:30 AM - 5:00 PM)"),
        price_per_hour: v.price_per_hour || (v.type === "avr" ? 500 : 300),
        raw: v
      };
    });
  };

  useEffect(() => {
    const fetchVenues = () => {
      api.get("/public/venues")
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          const formatted = formatVenues(list);
          setVenues(formatted);
          if (formatted.length > 0) {
            try {
              localStorage.setItem("fsuu_venues_catalog", JSON.stringify(formatted));
            } catch {}
          }
        })
        .catch(() => {
          try {
            const saved = JSON.parse(localStorage.getItem("fsuu_venues_catalog") || "[]");
            setVenues(formatVenues(saved));
          } catch {
            setVenues([]);
          }
        })
        .finally(() => setVenuesLoading(false));
    };

    fetchVenues();
    window.addEventListener("venues_updated", fetchVenues);

    api.get('/public/venue-bookings')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setExistingBookings(data);
      })
      .catch(() => setExistingBookings([]));

    return () => {
      window.removeEventListener("venues_updated", fetchVenues);
    };
  }, []);

  const filteredVenues = venueCategory === "all"
    ? venues
    : venues.filter(v => v.type === venueCategory);

  const handleIdentitySelect = (id) => {
    const norm = (id || "").toLowerCase();
    setIdentity(norm);

    if (isPortal) {
      const isSystemPinActive = pinRules?.isEnabled !== false && pinRules?.isEnabled !== "false";
      const externalRequiresPin = isSystemPinActive && (pinRules?.enableExternalVenue !== false && pinRules?.enableExternalVenue !== "false") && norm === "external";

      if (externalRequiresPin && !isPinVerified) {
        setPinModalMeta({
          title: "Verification Pin",
          description: "External client reservations required clearance Pin.",
        });
        setShowPinModal(true);
        return;
      }
    }

    if (!completedSteps.includes(1)) setCompletedSteps([...completedSteps, 1]);
    setActiveStep(2);
  };

  const handleVenueSelect = (v) => {
    setSelectedVenue(v);
  };

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
  };

  const formatTime12 = (tStr) => {
    if (!tStr) return "";
    const [h, m] = tStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  };

  const handleStep2Next = () => {
    if (!selectedVenue) {
      alert("Please select a venue first.");
      return;
    }
    if (!selectedDate) {
      alert("Please select a reservation date.");
      return;
    }
    if (isPastDateTime(selectedDate, startTime)) {
      alert("Selected booking date or time has already passed. Please select a future date and time.");
      return;
    }
    if (selectedEndDate && selectedEndDate < selectedDate) {
      alert("Reservation end date cannot be earlier than the start date.");
      return;
    }
    if (endTime <= startTime) {
      alert("Time End must be later than Time Start.");
      return;
    }

    // Hard block if conflicting booking exists
    const targetEndDate = selectedEndDate && selectedEndDate >= selectedDate ? selectedEndDate : selectedDate;
    const vName = (selectedVenue.name || "").toLowerCase();
    const INACTIVE = ["completed", "done", "returned", "rejected", "cancelled", "cancelled_by_user", "cancelled_by_admin", "solved", "damaged", "lost"];
    const conflict = existingBookings.find(b => {
      const bStatus = String(b.status || b.tracking_number?.status || "").toLowerCase();
      if (INACTIVE.includes(bStatus)) return false;

      const bVenueName = (b.venue?.name || b.venue_name || "").toLowerCase();
      const matchVenue = String(b.venue_id) === String(selectedVenue.id) ||
        (bVenueName && (bVenueName.includes(vName) || vName.includes(bVenueName)));
      if (!matchVenue) return false;

      const bStartDate = b.date_of_usage ? b.date_of_usage.substring(0, 10) : (b.date_of_use || "");
      const bEndDate = b.reservation_end_date ? b.reservation_end_date.substring(0, 10) : bStartDate;
      const dateOverlap = bStartDate <= targetEndDate && bEndDate >= selectedDate;
      if (!dateOverlap) return false;

      const toMin = (t) => {
        if (!t) return 0;
        const [h, m] = t.split(":").map(Number);
        return (h || 0) * 60 + (m || 0);
      };
      const bStart = b.time_start?.substring(0, 5) || "08:00";
      const bEnd = b.time_end?.substring(0, 5) || "17:00";
      return Math.max(toMin(startTime), toMin(bStart)) < Math.min(toMin(endTime), toMin(bEnd));
    });

    if (conflict) {
      alert(`Conflict Detected! ${selectedVenue.name} is already booked from ${formatTime12(conflict.time_start?.substring(0, 5))} to ${formatTime12(conflict.time_end?.substring(0, 5))} on ${conflict.date_of_usage?.substring(0, 10) || selectedDate}. You cannot proceed with this schedule.`);
      return;
    }

    const venueOpen = opHours?.venue_open?.substring(0, 5) || "07:30";
    const venueClose = opHours?.venue_close?.substring(0, 5) || "17:00";
    const isOutsideHours = (startTime && startTime < venueOpen) || (endTime && endTime > venueClose);
    
    let diffDays = 0;
    if (selectedEndDate && selectedEndDate > selectedDate) {
      const startD = new Date(selectedDate);
      const endD = new Date(selectedEndDate);
      const diffTime = endD - startD;
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (isPortal) {
      // In Portal Mode: Allow multi-day, short-notice, and outside hours WITH Verification PIN
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + 3);
      const pad = (n) => String(n).padStart(2, "0");
      const minDateStr = `${minDate.getFullYear()}-${pad(minDate.getMonth() + 1)}-${pad(minDate.getDate())}`;
      const isShortNotice = selectedDate < minDateStr;

      const isMultiDay = diffDays >= 1;
      const isSystemPinActive = pinRules?.isEnabled !== false && pinRules?.isEnabled !== "false";
      const outsideRequiresPin = (pinRules?.requirePinOutsideHours !== false && pinRules?.requirePinOutsideHours !== "false") && isOutsideHours;
      const multiDayRequiresPin = (pinRules?.requirePinMultiDayVenue !== false && pinRules?.requirePinMultiDayVenue !== "false") && isMultiDay;
      const externalRequiresPin = (pinRules?.enableExternalVenue !== false && pinRules?.enableExternalVenue !== "false") && identity === "external";

      const requiresPin = isSystemPinActive && (
        externalRequiresPin ||
        outsideRequiresPin ||
        multiDayRequiresPin ||
        isShortNotice
      );

      if (requiresPin && !isPinVerified) {
        if (isShortNotice) {
          setPinModalMeta({
            title: "Short-Notice Booking Verification PIN",
            description: `Selected date (${selectedDate}) is within the 3-day notice window (tomorrow / short-notice booking). AVR Head / Admin Verification PIN is required for authorization.`,
          });
        } else if (multiDayRequiresPin) {
          setPinModalMeta({
            title: "Multi-Day Venue Reservation PIN",
            description: `This venue reservation spans ${diffDays + 1} days (multi-day booking). AVR Head / Admin Verification PIN is required to authorize multi-day reservations.`,
          });
        } else if (outsideRequiresPin) {
          setPinModalMeta({
            title: "Outside Office Hours PIN",
            description: `Selected booking time (${formatTime12(startTime)} - ${formatTime12(endTime)}) is outside campus hours (${formatTime12(venueOpen)} - ${formatTime12(venueClose)}). AVR Head / Admin Verification PIN is required for authorization.`,
          });
        } else if (externalRequiresPin) {
          setPinModalMeta({
            title: "Verification Pin",
            description: "External client reservations required clearance Pin.",
          });
        }

        setShowPinModal(true);
        setPinError(false);
        setPinInput("");
        return;
      }
    } else {
      // Public Rule: Limit to maximum 3 days duration (start date + 2 additional days max)
      if (diffDays > 2) {
        alert(`Public venue bookings are strictly limited to a maximum duration of 3 days. You cannot extend the reservation date beyond 3 days. Please adjust your date range.`);
        return;
      }

      // Public Rule: Must follow operational hours (no outside-hours extension)
      if (isOutsideHours) {
        alert(`Selected booking time (${formatTime12(startTime)} - ${formatTime12(endTime)}) is outside official campus operating hours (${formatTime12(venueOpen)} - ${formatTime12(venueClose)}). Please select a time range within operating hours.`);
        return;
      }
    }

    if (!completedSteps.includes(2)) setCompletedSteps([...completedSteps, 2]);
    setActiveStep(3);
  };

  const handleConfirmPin = (e) => {
    e.preventDefault();
    if (pinInput.trim() === "123456" || pinInput.trim().length >= 4) {
      setIsPinVerified(true);
      setShowPinModal(false);
      setPinError(false);

      if (!completedSteps.includes(2)) setCompletedSteps([...completedSteps, 2]);
      setActiveStep(3);
    } else {
      setPinError(true);
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
      let endpoint = '';
      const targetEndDate = selectedEndDate || selectedDate;
      const startDt = `${selectedDate} ${startTime}:00`;
      const endDt = `${targetEndDate} ${endTime}:00`;

      const payload = {
        requestor_name: fullName,
        requestor_email: email,
        requestor_contact_number: contactNumber,
        requestor_program_office: department,
        requestor_identity_type: classification === 'external' ? 'external' : 'student',
        title_of_reservation: purpose,
        purpose: purpose,
        event_type: 'general',
        start_datetime: startDt,
        end_datetime: endDt,
        date_of_usage: selectedDate,
        reservation_end_date: targetEndDate,
        time_start: startTime,
        time_end: endTime,
        contact_preference: 'email',
        venue_id: selectedVenue?.id,
      };

      // Format selected equipment with requested quantities and resolved category names
      let equipFormatted = Object.entries(avrEquipment)
        .filter(([_, val]) => Boolean(val))
        .map(([key, val]) => {
          const qty = typeof val === 'number' ? val : 1;
          const found = (equipmentCatalog || []).find(c => String(c.id) === String(key) || String(c.eq_name || c.name).toLowerCase() === String(key).toLowerCase());
          const catName = found?.eq_name || found?.name || found?.category || key;
          return `${catName} (Qty: ${qty})`;
        })
        .join(', ');
      if (equipmentRemarks && equipmentRemarks.trim()) {
        equipFormatted = equipFormatted ? `${equipFormatted} | Equipment-Needed: ${equipmentRemarks.trim()}` : `Equipment-Needed: ${equipmentRemarks.trim()}`;
      }
      payload.equipment_notes = equipFormatted;

      const equipItems = Object.entries(avrEquipment)
        .filter(([_, val]) => Boolean(val))
        .map(([key, val]) => ({
          equipment_type_id: key,
          quantity_requested: typeof val === 'number' ? val : 1,
        }));
      payload.equipment_items = JSON.stringify(equipItems);

      endpoint = '/public/avr-venue-bookings';
      payload.booking_classification = classification || 'academic';
      payload.number_of_persons = parseInt(persons, 10) || 1;
      payload.is_pin_verified = isPinVerified ? 1 : 0;
      payload.pin_override = isPinVerified ? 1 : 0;

      const formData = new FormData();
      Object.keys(payload).forEach(key => {
        if (payload[key] !== undefined && payload[key] !== null) {
          formData.append(key, payload[key]);
        }
      });
      if (endorsementFile) {
        const fileToAppend = endorsementFile instanceof File ? endorsementFile : (endorsementFile?.file instanceof File ? endorsementFile.file : endorsementFile);
        if (fileToAppend) {
          formData.append('endorsement_file', fileToAppend);
        }
      }

      const res = await api.post(endpoint, formData);

      const rawTracking = res.data?.tracking_number;
      const trackingNum = (typeof rawTracking === 'string' ? rawTracking : rawTracking?.reference_code || rawTracking?.tracking_number)
        || res.data?.reference_code
        || (res.data?.id ? `TRK-VN-${res.data.id}` : 'FSUU-REQ-PENDING');

      setReferenceCode(trackingNum);
      setShowSuccess(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed. Please check form details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [copiedTrack, setCopiedTrack] = useState(false);

  const handleCopyTrack = () => {
    if (!referenceCode) return;
    navigator.clipboard.writeText(referenceCode);
    setCopiedTrack(true);
    setTimeout(() => setCopiedTrack(false), 2000);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 4-Step Timeline Component */}
      <div className="w-full max-w-4xl mb-6">
        <KioskTimeline
          steps={VENUE_STEPS}
          currentStep={activeStep}
          completedSteps={completedSteps}
          onStepClick={(s) => {
            if (s <= activeStep || completedSteps.includes(s - 1)) {
              setActiveStep(s);
            }
          }}
        />
      </div>

      <div className="w-full max-w-5xl">
        {activeStep === 1 && (
          <Step1Identity
            selectedIdentity={identity}
            onSelectIdentity={handleIdentitySelect}
            onNext={() => handleIdentitySelect(identity)}
            isPortal={isPortal}
          />
        )}

        {activeStep === 2 && (
          <Step2Venue
            identity={identity}
            venueCategory={venueCategory}
            setVenueCategory={setVenueCategory}
            filteredVenues={filteredVenues}
            selectedVenue={selectedVenue}
            handleVenueSelect={handleVenueSelect}
            selectedDate={selectedDate}
            handleDateSelect={handleDateSelect}
            selectedEndDate={selectedEndDate}
            setSelectedEndDate={setSelectedEndDate}
            timeStart={startTime}
            setTimeStart={setStartTime}
            timeEnd={endTime}
            setTimeEnd={setEndTime}
            existingBookings={existingBookings}
            opHours={opHours}
            pinRules={pinRules}
            isPinVerified={isPinVerified}
            setIsPinVerified={setIsPinVerified}
            setShowPinModal={setShowPinModal}
            setPinModalMeta={setPinModalMeta}
            onBack={() => setActiveStep(1)}
            onNext={handleStep2Next}
            venuesLoading={venuesLoading}
            isPortal={isPortal}
          />
        )}

        {activeStep === 3 && (
          <Step3Details
            identity={identity}
            selectedVenue={selectedVenue}
            selectedDate={selectedDate}
            selectedEndDate={selectedEndDate}
            handleDetailsSubmit={handleDetailsSubmit}
            fullName={fullName} setFullName={setFullName}
            email={email} setEmail={setEmail}
            contactNumber={contactNumber} handleContactChange={handleContactChange}
            department={department} setDepartment={setDepartment}
            purpose={purpose} setPurpose={setPurpose}
            persons={persons} setPersons={setPersons}
            classification={classification} setClassification={setClassification}
            startTime={startTime} setStartTime={setStartTime}
            endTime={endTime} setEndTime={setEndTime}
            avrEquipment={avrEquipment} setAvrEquipment={setAvrEquipment}
            equipmentRemarks={equipmentRemarks} setEquipmentRemarks={setEquipmentRemarks}
            equipmentCatalog={equipmentCatalog}
            onBack={() => setActiveStep(2)}
          />
        )}

        {activeStep === 4 && (
          <Step4Verification
            filerName={fullName}
            email={email}
            contactNumber={contactNumber}
            selectedVenue={selectedVenue}
            selectedDate={selectedDate}
            selectedEndDate={selectedEndDate}
            timeStart={startTime}
            timeEnd={endTime}
            purpose={purpose}
            agreedToPolicy={isPinVerified}
            setAgreedToPolicy={setIsPinVerified}
            handleVerifySubmit={handleVerifySubmit}
            isSubmitting={isSubmitting}
            endorsementFile={endorsementFile}
            setEndorsementFile={setEndorsementFile}
            avrEquipment={avrEquipment}
            equipmentCatalog={equipmentCatalog}
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
          }
          // Note: When on Step 2 (Select Venue), verifying PIN marks it as verified but does NOT auto-advance.
          // The user must explicitly click the "Next: Fill Details" button to proceed.
        }}
        title={pinModalMeta.title}
        description={pinModalMeta.description}
      />

      {/* Enhanced Confirmation Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-lg w-full text-center shadow-2xl animate-in zoom-in-95 duration-300 relative border border-slate-100 space-y-5">
            <div className="w-18 h-18 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/20 shadow-inner">
              <ShieldCheck size={38} />
            </div>
            
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Venue Reservation Submitted!</h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Your reservation request for <strong>{selectedVenue?.name}</strong> has been logged in the university system.
              </p>
            </div>

            {/* Prominent Tracking Code Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                Official Tracking Number
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-xl font-black text-blue-700 tracking-wider">
                  {referenceCode || "TRK-AVR-PENDING"}
                </span>
                <button
                  type="button"
                  onClick={handleCopyTrack}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer shadow-2xs"
                  title="Copy Tracking Number"
                >
                  {copiedTrack ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
              {copiedTrack && (
                <span className="text-[10.5px] font-bold text-emerald-600 block">Copied to clipboard!</span>
              )}
            </div>

            {/* Instruction Notice for Verification & Dual-Dispatch */}
            <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-left space-y-1.5 text-xs text-blue-950">
              <p className="font-bold flex items-center gap-1.5">
                <span>📌 Important Next Steps:</span>
              </p>
              <ul className="list-disc pl-4 space-y-1 font-medium text-[11.5px] text-blue-900 leading-relaxed">
                <li>Keep this <strong>Tracking Number</strong> for reservation verification and clearance tracking.</li>
                <li>Confirmation details and live status updates have been sent to both your <strong>Email</strong> ({email || 'registered email'}) and <strong>SMS</strong> ({contactNumber || 'registered phone'}).</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Link
                to={`/track?ref=${encodeURIComponent(referenceCode)}`}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-extrabold shadow-md transition-all text-center"
              >
                Track Reservation Status
              </Link>
              <Link
                to="/"
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-extrabold transition-all text-center"
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
