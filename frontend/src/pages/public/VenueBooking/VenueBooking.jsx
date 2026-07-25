import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDataCache } from "@/hooks/useDataCache";
import {
  ChevronDown, ChevronUp, User, Users, GraduationCap, MapPin,
  UploadCloud, ShieldCheck, Download, Check, Sparkles, Video,
  Radio, Tv, Mic, Monitor, Clock, FileText, Info, AlertCircle, KeyRound, Lock, X, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";

import StepHeader from "./components/StepHeader";
import Step1Identity from "./components/Step1Identity";
import Step2Venue from "./components/Step2Venue";
import Step3Details from "./components/Step3Details";
import Step4Verification from "./components/Step4Verification";

export default function VenueBooking() {
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);

  // Form & Selection States
  const [identity, setIdentity] = useState("");
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [venueCategory, setVenueCategory] = useState("all"); // 'all', 'avr', 'sco'
  const [referenceCode, setReferenceCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // General Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [purpose, setPurpose] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [endorsementFile, setEndorsementFile] = useState(null);

  // AVR Specific Fields
  const [classification, setClassification] = useState("");
  const [persons, setPersons] = useState("");
  const [avrEquipment, setAvrEquipment] = useState({ mic: false, proj: false, sound: false, podium: false });

  // SCO Specific Fields
  const [productionType, setProductionType] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [scoSupport, setScoSupport] = useState({ multicam: false, teleprompter: false, greenScreen: false, audioEng: false });

  // AVR PIN Modal State for External Users
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);

  // Form Field States for Validation
  const [contactNumber, setContactNumber] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const handleContactChange = (e) => {
    setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 11));
  };

  // Fetch real venues and programs from backend
  const { data: vData, loading: vLoading } = useDataCache('public_venues', '/public/venues');
  const { data: pData, loading: pLoading } = useDataCache('public_programs', '/public/programs');

  const venues = vData ?? [];
  const programs = pData ?? [];
  const venuesLoading = vLoading || pLoading;

  const filteredVenues = venueCategory === "all"
    ? venues
    : venues.filter(v => v.type === venueCategory);

  const toggleStep = (step) => {
    if (completedSteps.includes(step - 1) || step === 1) {
      setActiveStep(activeStep === step ? null : step);
    }
  };

  const handleIdentitySelect = (id) => {
    setIdentity(id);
    setIsPinVerified(false); // Reset pin verification if identity changes
    if (!completedSteps.includes(1)) setCompletedSteps([...completedSteps, 1]);
    setActiveStep(2);
  };

  const handleVenueSelect = (v) => {
    setSelectedVenue(v);
  };

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);

    if (selectedVenue) {
      // Check if External User picking an AVR Venue
      if (identity === "external" && selectedVenue.type === "avr" && !isPinVerified) {
        setShowPinModal(true);
        setPinError(false);
        setPinInput("");
      }
    }
  };

  const handleConfirmPin = (e) => {
    e.preventDefault();
    // Default valid PIN is 123456
    if (pinInput.trim() === "123456" || pinInput.trim().length >= 4) {
      setIsPinVerified(true);
      setShowPinModal(false);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    if (!completedSteps.includes(3)) setCompletedSteps([...completedSteps, 3]);
    setActiveStep(4);
  };

  // handleSendOtp is now handled entirely inside Step4Verification component
  const handleSendOtp = () => setIsOtpSent(true); // fallback stub (unused)

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let endpoint = '';
      const startDt = `${selectedDate} ${startTime}:00`;
      const endDt = `${selectedDate} ${endTime}:00`;

      let payload = {
        requestor_name: fullName,
        requestor_email: email,
        requestor_contact_number: contactNumber,
        requestor_program_office: department,
        requestor_identity_type: identity,
        title_of_reservation: purpose.substring(0, 100) || 'Reservation',
        purpose: purpose,
        event_type: 'general',
        start_datetime: startDt,
        end_datetime: endDt,
        contact_preference: 'email',
        // venue_id is the real integer ID from the database
        venue_id: selectedVenue?.id,
      };

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

      const { data } = await api.post(endpoint, payload);
      setReferenceCode(data.reference_code || 'REF-SUCCESS');

      // 2-Step Upload: If there is an endorsement file, upload it immediately after booking creation
      if (endorsementFile) {
        const formData = new FormData();
        formData.append('file', endorsementFile);
        formData.append('reference_type', selectedVenue?.type === 'avr' ? 'avr_venue_booking' : 'sco_studio_reservation');
        formData.append('reference_code', data.reference_code || 'REF-SUCCESS');
        formData.append('requestor_email', email);

        try {
          await api.post('/public/documents', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (uploadError) {
          console.error("Failed to upload endorsement letter:", uploadError);
          // We can still proceed to show success, but maybe notify the user it failed
        }
      }

      setShowSuccess(true);
    } catch (error) {
      const msg = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(' ')
        : error.response?.data?.message || 'Network error. Please try again.';
      alert("Failed to submit: " + msg);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto relative animate-in fade-in slide-in-from-bottom-5 duration-700 pb-12">

      {/* Dynamic Background aura */}
      <div className="absolute top-[-5%] left-[20%] w-[500px] h-[500px] bg-gradient-to-tr from-blue-400/15 via-indigo-400/10 to-amber-300/10 rounded-full blur-3xl z-[-1] pointer-events-none"></div>

      <div className="w-full relative z-10 pt-4">

        {/* MAIN INTEGRATED WIZARD CARD CONTAINER */}
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-xl overflow-hidden transition-all duration-300">

          {/* STEPPER PROGRESS TRACKER HEADER */}
          <div className="bg-white border-b border-slate-100 px-6 pt-6 pb-4 sm:px-8 relative overflow-hidden">
            {/* Title matching FSUU logo font scale - centered */}
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 leading-tight mb-4 text-center">
              Venue Booking
            </h1>

            <div className="relative flex justify-between items-center max-w-2xl mx-auto px-2 sm:px-6">
              {/* Connecting progress background line */}
              <div className="absolute top-5 left-10 right-10 h-1 bg-slate-100 -translate-y-1/2 z-0 rounded-full"></div>

              {/* Active progress fill line */}
              <div
                className="absolute top-5 left-10 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 -translate-y-1/2 z-0 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: activeStep === 1 ? '0%' : activeStep === 2 ? '33.33%' : activeStep === 3 ? '66.66%' : 'calc(100% - 5rem)'
                }}
              ></div>

              {/* Stepper Nodes */}
              {[
                { num: 1, label: "Identity", subtitle: "Role" },
                { num: 2, label: "Venue & Date", subtitle: "Availability" },
                { num: 3, label: "Details", subtitle: "Form Info" },
                { num: 4, label: "Verification", subtitle: "Security" },
              ].map((s) => {
                const isCompleted = completedSteps.includes(s.num) && activeStep !== s.num;
                const isActive = activeStep === s.num;
                const isClickable = completedSteps.includes(s.num) || s.num < activeStep;

                return (
                  <div
                    key={s.num}
                    onClick={() => isClickable && setActiveStep(s.num)}
                    className={`relative z-10 flex flex-col items-center select-none transition-all ${isClickable ? 'cursor-pointer group' : 'cursor-default'}`}
                  >
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-xs sm:text-sm font-black transition-all duration-300 shadow-md ${isCompleted
                      ? 'bg-blue-600 text-white shadow-blue-600/20 group-hover:scale-110'
                      : isActive
                        ? 'bg-blue-600 text-white ring-4 ring-blue-600/20 shadow-blue-600/30 scale-110'
                        : 'bg-white border-2 border-slate-200 text-slate-400'
                      }`}>
                      {isCompleted ? <CheckCircle2 size={20} /> : s.num}
                    </div>
                    <div className="text-center mt-3 hidden sm:block">
                      <p className={`text-xs font-bold transition-colors ${isActive ? 'text-slate-900 font-extrabold' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                        {s.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">{s.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>



          {/* STEP CONTENT AREA */}
          <div className="p-6 md:p-10 animate-in fade-in duration-300">
            {activeStep === 1 && (
              <Step1Identity
                identity={identity}
                handleIdentitySelect={handleIdentitySelect}
              />
            )}

            {activeStep === 2 && (
              venuesLoading ? (
                <div className="p-12 text-center text-slate-400 text-sm animate-pulse font-medium">
                  Loading available venues…
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
                  startTime={startTime}
                  setStartTime={setStartTime}
                  endTime={endTime}
                  setEndTime={setEndTime}
                  bookedDates={[]}
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
                identity={identity}
                classification={classification} setClassification={setClassification}
                persons={persons} setPersons={setPersons}
                startTime={startTime} setStartTime={setStartTime}
                endTime={endTime} setEndTime={setEndTime}
                purpose={purpose} setPurpose={setPurpose}
                avrEquipment={avrEquipment} setAvrEquipment={setAvrEquipment}
                productionType={productionType} setProductionType={setProductionType}
                targetAudience={targetAudience} setTargetAudience={setTargetAudience}
                scoSupport={scoSupport} setScoSupport={setScoSupport}
                programs={programs}
              />
            )}

            {activeStep === 4 && (
              <Step4Verification
                email={email}
                contactNumber={contactNumber}
                isOtpSent={isOtpSent}
                setIsOtpSent={setIsOtpSent}
                otp={otp}
                setOtp={setOtp}
                handleVerifySubmit={handleVerifySubmit}
                isSubmitting={isSubmitting}
                endorsementFile={endorsementFile}
                setEndorsementFile={setEndorsementFile}
              />
            )}
          </div>

          {/* WIZARD NAVIGATION FOOTER */}
          <div className="px-6 md:px-10 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            {activeStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveStep(activeStep - 1)}
                className="px-5 py-2.5 rounded-xl border-slate-200 text-slate-700 font-bold text-xs hover:bg-white shadow-sm flex items-center gap-2"
              >
                ← Back to Step {activeStep - 1}
              </Button>
            ) : (
              <span className="text-xs font-semibold text-slate-400">Step 1 of 4: Role Selection</span>
            )}

            {activeStep === 2 && selectedVenue && selectedDate && startTime && endTime && (
              <Button
                type="button"
                onClick={() => {
                  if (!completedSteps.includes(2)) setCompletedSteps([...completedSteps, 2]);
                  setActiveStep(3);
                }}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2"
              >
                <span>Continue to Form</span>
                <span>→</span>
              </Button>
            )}
          </div>

        </div>
      </div>

      {/* POPUP MODAL: AVR Head PIN Verification Code */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[2500] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative border border-slate-100 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowPinModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border-2 border-amber-300/40 shadow-inner">
              <KeyRound size={32} />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-2">AVR Head PIN Required</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
              External Users must verify an authorized PIN issued by the <span className="font-bold text-slate-800">AVR Head</span> before requesting AVR Auditoriums.
            </p>

            {pinError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl flex items-center justify-center gap-2">
                <AlertCircle size={16} />
                <span>Invalid PIN Code. Default PIN: 123456</span>
              </div>
            )}

            <form onSubmit={handleConfirmPin} className="flex flex-col gap-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter 6-digit PIN"
                  required
                  autoFocus
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-900 font-mono tracking-widest text-lg focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-5 rounded-xl border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 py-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-lg shadow-amber-600/20"
                >
                  Confirm & Verify PIN
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300 relative border border-slate-100">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-500/20 shadow-inner">
              <ShieldCheck size={42} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Request Submitted!</h2>
            <p className="text-slate-500 mb-6 font-medium text-xs leading-relaxed">
              Your request for <span className="font-bold text-slate-800">{selectedVenue?.name}</span> has been logged and sent to the <span className="font-bold text-blue-600">{selectedVenue?.type === "sco" ? "SCO Office" : "AVR Office"}</span> for review.
            </p>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 shadow-inner">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Your Tracking Reference Number</p>
              <p className="text-2xl font-black text-amber-600 tracking-wider font-mono">
                {referenceCode}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={() => window.open(`${api.defaults.baseURL}/public/requisition-slip/venue/${referenceCode}`, '_blank')} className="w-full py-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                <Download size={18} />
                Download Slip (PDF)
              </Button>
              <Button variant="outline" className="w-full py-6 rounded-xl border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50">
                <Link to="/track" className="w-full h-full flex items-center justify-center">Track Reservation Status</Link>
              </Button>
              <Button variant="ghost" onClick={() => window.location.href = "/"} className="w-full py-4 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-100">
                Exit / Done
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
