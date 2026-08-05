import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, KeyRound, Lock, X, AlertCircle, ShieldCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KioskTimeline } from "@/components/ui/kiosk-timeline";
import { PinModal } from "@/components/ui/pin-modal";
import api from "@/lib/axios";

import Step1Identity from "./components/Step1Identity";
import Step2Venue from "./components/Step2Venue";
import Step3Details from "./components/Step3Details";
import Step4Verification from "./components/Step4Verification";

const VENUE_STEPS = [
  { title: "SELECT ROLE", subtitle: "Select role" },
  { title: "DATE & TIME", subtitle: "Choose venue & schedule" },
  { title: "FILL DETAILS", subtitle: "Reservation form" },
  { title: "UPLOAD & SUBMIT", subtitle: "Upload & submit" },
];


export default function VenueBooking() {
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);

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

  // SCO Specific Fields
  const [productionType, setProductionType] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [scoSupport, setScoSupport] = useState({ multicam: false, teleprompter: false, greenScreen: false, audioEng: false });

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
    api.get('/public/equipment-types')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setEquipmentCatalog(list);
      })
      .catch(() => setEquipmentCatalog([]));
  }, []);

  const handleContactChange = (e) => {
    setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 11));
  };

  const getMergedVenues = (apiVenues = []) => {
    let localVenues = [];
    try {
      const saved = localStorage.getItem("fsuu_venue_availability");
      if (saved) localVenues = JSON.parse(saved);
    } catch { }

    const formatVenue = (v) => {
      const clean = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const match = localVenues.find(lv => lv.id === v.id || clean(lv.name) === clean(v.name));
      const avatarPhoto = v.avatar || v.photo || v.image || v.avatar_url || v.photo_url || match?.photo || match?.avatar || match?.image || null;

      return {
        ...v,
        id: v.id,
        name: v.name,
        location: v.office?.location || v.location || match?.location || (v.name.includes("SCO") ? "FSUU Morelos Campus" : "FSUU Main Campus"),
        capacity: v.capacity || match?.capacity || 100,
        type: (v.name.includes("SCO") || v.name.includes("Studio")) ? "sco" : "avr",
        photo: avatarPhoto,
        image: avatarPhoto,
        avatar: avatarPhoto,
        status: match?.status || v.status || "Available",
        schedule: match?.schedule || v.schedule || null,
      };
    };

    if (apiVenues.length > 0) {
      return apiVenues.map(formatVenue);
    }

    return localVenues.map(formatVenue);
  };

  useEffect(() => {
    const fetchVenues = () => {
      api.get('/public/venues')
        .then(res => setVenues(getMergedVenues(res.data ?? [])))
        .catch(() => setVenues(getMergedVenues([])))
        .finally(() => setVenuesLoading(false));
    };

    fetchVenues();

    const handleUpdate = () => setVenues(getMergedVenues([]));
    window.addEventListener("venue_availability_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    api.get('/public/venue-bookings')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setExistingBookings(data);
      })
      .catch(() => setExistingBookings([]));

    return () => {
      window.removeEventListener("venue_availability_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const filteredVenues = venueCategory === "all"
    ? venues
    : venues.filter(v => v.type === venueCategory);

  const handleIdentitySelect = (id) => {
    setIdentity(id);
    setIsPinVerified(false);
    if (!completedSteps.includes(1)) setCompletedSteps([...completedSteps, 1]);
    setActiveStep(2);
  };

  const handleVenueSelect = (v) => {
    setSelectedVenue(v);
  };

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
  };

  const handleStep2Next = () => {
    const isMultiDay = selectedEndDate && selectedEndDate > selectedDate;

    let requiresPin = false;
    try {
      const savedConfig = localStorage.getItem("fsuu_pin_config");
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.requirePinForStudent) {
          requiresPin = true;
        } else {
          requiresPin = identity === "external" || isMultiDay;
        }
      } else {
        requiresPin = identity === "external" || isMultiDay;
      }
    } catch {
      requiresPin = identity === "external" || isMultiDay;
    }

    if (requiresPin && !isPinVerified) {
      setShowPinModal(true);
      setPinError(false);
      setPinInput("");
      return;
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
        contact_preference: 'email',
        venue_id: selectedVenue?.id,
      };

      // Format selected equipment with requested quantities
      const equipFormatted = Object.entries(avrEquipment)
        .filter(([_, val]) => Boolean(val))
        .map(([key, val]) => {
          const qty = typeof val === 'number' ? val : 1;
          return `${key} (Qty: ${qty})`;
        })
        .join(', ');
      payload.equipment_notes = equipFormatted;

      if (selectedVenue?.type === 'avr') {
        endpoint = '/public/avr-venue-bookings';
        payload.booking_classification = classification || 'academic';
        payload.number_of_persons = parseInt(persons, 10) || 1;
      } else {
        endpoint = '/public/sco-studio-reservations';
        payload.production_type = productionType || 'video';
        payload.broadcast_target_audience = targetAudience || 'general';
        payload.booking_classification = 'academic';
        payload.number_of_persons = parseInt(persons, 10) || 1;
      }

      const formData = new FormData();
      Object.keys(payload).forEach(key => {
        if (payload[key] !== undefined && payload[key] !== null) {
          formData.append(key, payload[key]);
        }
      });
      if (endorsementFile) {
        formData.append('endorsement_file', endorsementFile);
      }

      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const ref = data.tracking_number?.reference_code || data.reference_code || (data.id ? `TRK-AVR${data.id}` : 'TRK-SUCCESS');
      setReferenceCode(ref);

      // Save to local storage cache so portal immediately displays new booking
      try {
        const newBk = {
          ...data,
          id: data.id || Date.now(),
          reference_code: ref,
          filer_name: fullName,
          requestor_name: fullName,
          email_address: email,
          requestor_email: email,
          contact_number: contactNumber,
          program_office: department,
          purpose: purpose,
          venue_id: selectedVenue?.id,
          venue_name: selectedVenue?.name,
          venue: selectedVenue,
          date_of_usage: selectedDate,
          time_start: startTime,
          time_end: endTime,
          status: 'pending',
          created_at: new Date().toISOString(),
        };
        const saved = localStorage.getItem("fsuu_venue_bookings");
        const list = saved ? JSON.parse(saved) : [];
        list.unshift(newBk);
        localStorage.setItem("fsuu_venue_bookings", JSON.stringify(list));
        window.dispatchEvent(new Event("venue_bookings_updated"));
      } catch {}

      setShowSuccess(true);
    } catch (error) {
      const errObj = error.response?.data?.errors;
      const msg = error.response?.data?.message || (errObj ? Object.values(errObj).flat().join(' ') : 'Reservation submission failed. Please check form inputs.');
      alert("Failed to submit: " + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`flex flex-col items-center w-full mx-auto relative animate-in fade-in slide-in-from-bottom-5 duration-700 pb-12 ${activeStep === 2 ? "max-w-7xl" : "max-w-4xl"}`}>

      {/* Header Title */}
      <div className="text-center mb-8 w-full flex flex-col items-center justify-center">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tight text-center">
          Venue Booking
        </h1>
        <p className="text-slate-500 font-medium max-w-md sm:max-w-lg mx-auto text-xs sm:text-sm leading-relaxed text-center tracking-normal">
          Book AVR Auditoriums or SCO Webcast Studios with real-time schedule checks.
        </p>
      </div>

      {/* Horizontal Process Timeline */}
      <KioskTimeline
        steps={VENUE_STEPS}
        activeStep={activeStep}
        onStepClick={(step) => setActiveStep(step)}
        completedSteps={completedSteps}
      />

      {/* Active Step Content Container */}
      <div className="w-full bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">

        {activeStep === 1 && (
          <Step1Identity
            identity={identity}
            handleIdentitySelect={handleIdentitySelect}
            onNext={() => setActiveStep(2)}
          />
        )}

        {activeStep === 2 && (
          venuesLoading ? (
            <div className="p-10 text-center text-slate-400 text-xs font-semibold animate-pulse">
              Loading available venues...
            </div>
          ) : (
            <Step2Venue
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
              onBack={() => setActiveStep(1)}
              onNext={handleStep2Next}
            />
          )
        )}

        {activeStep === 3 && (
          <Step3Details
            selectedVenue={selectedVenue}
            selectedDate={selectedDate}
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
            equipmentCatalog={equipmentCatalog}
            productionType={productionType} setProductionType={setProductionType}
            targetAudience={targetAudience} setTargetAudience={setTargetAudience}
            scoSupport={scoSupport} setScoSupport={setScoSupport}
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
            timeStart={startTime}
            timeEnd={endTime}
            purpose={purpose}
            agreedToPolicy={isPinVerified}
            setAgreedToPolicy={setIsPinVerified}
            handleVerifySubmit={handleVerifySubmit}
            isSubmitting={isSubmitting}
            endorsementFile={endorsementFile}
            setEndorsementFile={setEndorsementFile}
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
          if (!completedSteps.includes(2)) setCompletedSteps([...completedSteps, 2]);
          setActiveStep(3);
        }}
        description="AVR Head PIN Required"
      />

      {/* Confirmation Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300 relative border border-slate-100 space-y-4">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/20 shadow-inner">
              <ShieldCheck size={42} />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Thank You!</h2>

            <div className="p-4.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-center">
              <p className="text-xs font-bold text-slate-800 leading-relaxed">
                Thank you for choosing Father Saturnino Urios University for your venue reservation!
              </p>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                Your official <strong>Tracking Number</strong> has been sent to your registered personal email address {email ? `(${email})` : ''} and contact number {contactNumber ? `(${contactNumber})` : ''}.
              </p>
              <p className="text-[11px] text-slate-500 font-medium italic border-t border-slate-200/60 pt-2 mt-1">
                Please check your inbox or phone messages to view your tracking number and check your booking progress.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => { window.location.href = "/"; }}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all hover:scale-[1.02]"
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

