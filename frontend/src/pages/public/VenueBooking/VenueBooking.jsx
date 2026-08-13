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

import { isPastDateTime } from "@/lib/dateTimeUtils";

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

      return {
        ...v,
        id: v.id,
        name: v.name,
        location: v.office?.location || v.location || "FSUU Main Campus",
        capacity: v.capacity || 100,
        type: "avr",
        photo: avatarPhoto,
        image: avatarPhoto,
        avatar: avatarPhoto,
        status: v.status || "Available",
        schedule: v.schedule || null,
      };
    });
  };

  useEffect(() => {
    const fetchVenues = () => {
      api.get('/public/venues')
        .then(res => {
          const formatted = formatVenues(res.data ?? []);
          setVenues(formatted);
        })
        .catch(() => setVenues([]))
        .finally(() => setVenuesLoading(false));
    };

    fetchVenues();

    api.get('/public/venue-bookings')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setExistingBookings(data);
      })
      .catch(() => setExistingBookings([]));
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
    if (isPastDateTime(selectedDate, startTime)) {
      alert("Selected booking date or time has already passed. Please select a future date and time.");
      return;
    }

    const isMultiDay = selectedEndDate && selectedEndDate > selectedDate;
    const requiresPin = identity === "external" || isMultiDay;

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
        date_of_usage: selectedDate,
        reservation_end_date: targetEndDate,
        time_start: startTime,
        time_end: endTime,
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
      window.dispatchEvent(new Event("venue_bookings_updated"));

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
          Book AVR Auditoriums and meeting venues with real-time schedule checks.
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

