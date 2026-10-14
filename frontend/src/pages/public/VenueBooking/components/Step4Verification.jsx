import { UploadCloud, X, FileText, Image, CheckCircle2, ShieldCheck, Download, Loader2, Camera, Plus, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import api from "@/lib/axios";
import EndorsementLetterTemplateModal from "@/components/ui/EndorsementLetterTemplateModal";
import DocxPreviewModal from "@/components/ui/DocxPreviewModal";
import AlertModal from "@/components/ui/AlertModal";

export default function Step4Verification({
  filerName,
  email,
  contactNumber,
  selectedVenue,
  selectedDate,
  selectedEndDate,
  timeStart,
  timeEnd,
  purpose,
  agreedToPolicy,
  setAgreedToPolicy,
  isSubmitting,
  handleVerifySubmit,
  endorsementFile,
  setEndorsementFile,
  avrEquipment = [],
  equipmentCatalog = [],
  classification = "",
  onBack,
}) {
  const fileInputRef = useRef(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDocxModal, setShowDocxModal] = useState(false);
  const [selectedDocx, setSelectedDocx] = useState({ url: "", name: "", title: "" });
  const [templateType, setTemplateType] = useState("organization");
  const [requirementsList, setRequirementsList] = useState([]);
  const [alertModal, setAlertModal] = useState({ open: false, title: "Notice", message: "" });
  const showAlert = (message, title = "Notice") => setAlertModal({ open: true, title, message });

  const [contactPhone, setContactPhone] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_system_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.contact_phone) return parsed.contact_phone;
      }
    } catch {}
    return "(085) 342-1830";
  });

  const [activeTemplate, setActiveTemplate] = useState(null);

  useEffect(() => {
    api.get("/public/system-settings")
      .then((res) => {
        if (res.data?.contact_phone) {
          setContactPhone(res.data.contact_phone);
        }
      })
      .catch(() => {});

    api.get("/public/booking-requirements")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setRequirementsList(list);

        const userClass = (classification || "").toLowerCase().trim();
        const matching = list.filter(r => {
          if (!userClass) return true;
          const rClass = (r.classification || "").toLowerCase().trim();
          if (rClass === "all" || !rClass) return true;
          if (userClass.includes("acad") && rClass.includes("acad")) return true;
          if ((userClass.includes("org") || userClass.includes("student")) && (rClass.includes("org") || rClass.includes("student"))) return true;
          if (userClass.includes("external") && rClass.includes("external")) return true;
          return false;
        });

        const templateMatch = matching.find(r => r.template_file_url) || list.find(r => r.template_file_url);
        if (templateMatch) {
          setActiveTemplate(templateMatch);
          if (templateMatch.classification) {
            setTemplateType(templateMatch.classification);
          }
        }
      })
      .catch(() => {});
  }, [classification]);

  const mobileCameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [filesList, setFilesList] = useState(() => {
    if (Array.isArray(endorsementFile)) return endorsementFile;
    if (endorsementFile) return [endorsementFile];
    return [];
  });

  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");

  const syncFiles = (nextList) => {
    setFilesList(nextList);
    setEndorsementFile(nextList.length === 0 ? null : (nextList.length === 1 ? nextList[0] : nextList));
  };

  const handleValidateAndAddFiles = (rawFiles) => {
    if (!rawFiles || rawFiles.length === 0) return;
    const incoming = Array.from(rawFiles);
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    const valid = [];

    for (const f of incoming) {
      if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|png|jpe?g|webp)$/i)) {
        showAlert(`File "${f.name}" is not supported. Only PDF, PNG, JPG, and WEBP files are allowed.`, "Unsupported File Type");
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        showAlert(`File "${f.name}" exceeds the 10 MB limit.`, "File Too Large");
        continue;
      }
      valid.push(f);
    }

    if (valid.length > 0) {
      const combined = [...filesList, ...valid];
      syncFiles(combined);
    }
  };

  const handleFileChange = (e) => {
    handleValidateAndAddFiles(e.target.files);
    if (e.target) e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleValidateAndAddFiles(e.dataTransfer.files);
    }
  };

  const removeFileAtIndex = (indexToRemove, e) => {
    if (e) e.stopPropagation();
    const updated = filesList.filter((_, idx) => idx !== indexToRemove);
    syncFiles(updated);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Camera Controller ──
  const startCameraStream = async (deviceId = "") => {
    stopCameraStream();
    setIsStartingCamera(true);
    setCameraError(null);
    setCapturedPhotoUrl(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this browser or connection. Please use file upload instead.");
      }

      const constraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } } 
          : { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Check available cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevs = devices.filter(d => d.kind === "videoinput");
        setCameraDevices(vDevs);
        if (!deviceId && vDevs.length > 0) {
          const currentTrack = stream.getVideoTracks()[0];
          const settings = currentTrack?.getSettings?.();
          if (settings?.deviceId) setSelectedCameraId(settings.deviceId);
        }
      } catch {}
    } catch (err) {
      setCameraError(err.message || "Failed to access camera. Please allow camera access in your browser settings or attach files directly.");
    } finally {
      setIsStartingCamera(false);
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const openCameraModal = () => {
    setShowCameraModal(true);
    setCapturedPhotoUrl(null);
    setTimeout(() => {
      startCameraStream();
    }, 100);
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setShowCameraModal(false);
    setCapturedPhotoUrl(null);
    setCameraError(null);
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedPhotoUrl(dataUrl);
  };

  const handleAcceptCapturedPhoto = () => {
    if (!capturedPhotoUrl) return;
    const arr = capturedPhotoUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const photoFile = new File([u8arr], `camera_endorsement_${Date.now()}.jpg`, { type: mime });
    handleValidateAndAddFiles([photoFile]);
    closeCameraModal();
  };

  const formatTime12 = (tStr) => {
    if (!tStr) return "";
    const [h, m] = tStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  };

  const userClass = (classification || "").toLowerCase().trim();
  const filteredRequirements = requirementsList.filter(r => {
    if (!userClass) return true;
    const rClass = (r.classification || "").toLowerCase().trim();
    if (rClass === "all" || !rClass) return true;
    if (userClass.includes("acad") && rClass.includes("acad")) return true;
    if ((userClass.includes("org") || userClass.includes("student")) && (rClass.includes("org") || rClass.includes("student"))) return true;
    if (userClass.includes("external") && rClass.includes("external")) return true;
    return false;
  });

  return (
    <div className="p-6 sm:p-8 animate-in slide-in-from-top-2 duration-300">
      
      {/* Side-by-Side Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

        {/* ── Left Column: Booking Requirements ── */}
        <div className="bg-slate-50/70 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200/80 dark:border-blue-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
              1. Booking Requirements
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {activeTemplate?.template_file_url ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDocx({
                        url: activeTemplate.template_file_url,
                        name: activeTemplate.template_file_name || `${activeTemplate.label || "Requirement"}.docx`,
                        title: activeTemplate.label || "Booking Requirement Template",
                      });
                      setShowDocxModal(true);
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0"
                    title="Preview official requirement template in-modal"
                  >
                    <FileText size={12} />
                    <span>View Template</span>
                  </button>
                  <a
                    href={activeTemplate.template_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0"
                    title={activeTemplate.template_file_name || "Download official booking template"}
                  >
                    <Download size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Download</span>
                  </a>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0"
                  title="View and copy approved endorsement letter format"
                >
                  <FileText size={12} />
                  <span>View Letter Format</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
            Attach your signed endorsement letter or authorization document below:
          </p>

          {/* Hidden File and Camera Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={mobileCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* ── Document Upload / Camera Area ── */}
          <div className="space-y-3">
            {/* Action Bar (Upload Multiple & Camera Buttons) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-blue-900/60 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Upload File(s)</span>
              </button>

              <button
                type="button"
                onClick={openCameraModal}
                className="flex-1 py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/70 dark:bg-blue-950/60 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Camera size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Take Photo</span>
              </button>
            </div>

            {/* Drag & Drop Zone */}
            {filesList.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all border-slate-300 dark:border-blue-900/50 bg-white dark:bg-slate-950/60 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-slate-900/60"
              >
                <div className="space-y-2">
                  <UploadCloud size={40} className="mx-auto text-slate-400 dark:text-slate-500" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to browse or drag &amp; drop file(s) here
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Supports multiple PDF, PNG, JPG, WEBP (Max 10MB per file)
                  </p>
                </div>
              </div>
            ) : (
              /* Attached Files List & Gallery */
              <div className="space-y-2 p-3 bg-white dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-blue-900/50">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800/80 px-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Attached Documents ({filesList.length})
                  </span>
                  <span className="text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Ready to Submit
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {filesList.map((file, idx) => {
                    const isFilePdf = file?.type === "application/pdf" || file?.name?.toLowerCase().endsWith(".pdf");
                    const previewUrl = !isFilePdf && file instanceof Blob ? URL.createObjectURL(file) : null;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-blue-900/40"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt={file.name}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : isFilePdf ? (
                            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center shrink-0">
                              <FileText size={20} className="text-rose-600 dark:text-rose-400" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center shrink-0">
                              <Image size={20} className="text-blue-600 dark:text-blue-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              {file.size ? `${(file.size / 1024).toFixed(1)} KB` : "Attached file"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => removeFileAtIndex(idx, e)}
                          className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-slate-600 dark:text-slate-400 cursor-pointer shrink-0 ml-2"
                          title="Remove attached file"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Reservation Review & Policy Agreement ── */}
        <div className="bg-slate-50/70 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200/80 dark:border-blue-900/50 space-y-5">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
            2. Reservation Review
          </h3>

          <div className="bg-white dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/80 dark:border-blue-900/40 space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <span className="text-slate-400 font-bold">Filer Name</span>
              <span className="font-bold text-slate-900 dark:text-white">{filerName || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <span className="text-slate-400 font-bold">Account Email</span>
              <span className="font-bold text-slate-900 dark:text-white">{email || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <span className="text-slate-400 font-bold">Contact No.</span>
              <span className="font-bold text-slate-900 dark:text-white">{contactNumber || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <span className="text-slate-400 font-bold">Venue Reserved</span>
              <span className="font-bold text-blue-700 dark:text-blue-400 font-mono">{selectedVenue?.name || "Facility"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <span className="text-slate-400 font-bold">Schedule</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {selectedDate ? new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                {selectedEndDate && String(selectedEndDate).substring(0,10) !== String(selectedDate).substring(0,10) && (
                  ` - ${new Date(selectedEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                )}
                {" "}({formatTime12(timeStart)} - {formatTime12(timeEnd)})
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <span className="text-slate-400 font-bold">Purpose</span>
              <span className="font-bold text-slate-900 dark:text-white max-w-[200px] text-right truncate">{purpose || "—"}</span>
            </div>

            {/* Equipment Category & Requested Physical Units */}
            {avrEquipment && avrEquipment.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider">Requested Equipment</span>
                <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/60 dark:border-blue-900/40">
                  {avrEquipment.map((eq, idx) => {
                    const catItem = (equipmentCatalog || []).find(c => c.id === eq.equipment_type_id || c.equipment_type_id === eq.equipment_type_id || c.id === eq.id);
                    const name = eq.name || catItem?.name || eq.equipment_name || `Equipment Item #${idx + 1}`;
                    const qty = eq.quantity || eq.qty || eq.quantity_requested || 1;
                    return (
                      <div key={eq.equipment_type_id || idx} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{name}</span>
                        <span className="font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60">
                          {qty} {qty === 1 ? 'physical unit' : 'physical units'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Terms Agreement Box */}
          <div className="bg-white dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/80 dark:border-blue-900/40 space-y-3">
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              <p className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">By confirming, the user agrees to:</p>
              <ul className="space-y-1.5 pl-0.5 list-none">
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                  <span>Ensure that all decorations &amp; materials adhere to venue policy and safety regulations.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                  <span>Held liable for any physical units used.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                  <span>Users granted a grace period 15 - 20 mins past their scheduled booking time; if they don't arrive within that time and doesn't have a valid excuse their booking is automatically cancelled.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                  <span>Have the AVR personnel inspect all materials prior to entry and may deny access to any items considered unsafe.</span>
                </li>
              </ul>
            </div>

            <label className="flex items-start gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60 -mx-1 px-1 py-1 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={agreedToPolicy}
                onChange={(e) => setAgreedToPolicy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] text-slate-900 dark:text-white font-bold leading-relaxed">
                I have read and agree to all venue policies and safety regulations.
              </span>
            </label>
          </div>

          {/* Note Footer */}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium text-center">
            Note: Should there be any problem please contact <span className="font-bold text-slate-600 dark:text-slate-400">{contactPhone}</span>.
          </p>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onBack && onBack()}
          className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-6 py-5 rounded-xl font-bold text-xs cursor-pointer"
        >
          ← Back to Details
        </Button>

        <Button
          onClick={handleVerifySubmit}
          disabled={isSubmitting || !agreedToPolicy}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-5 rounded-xl font-extrabold text-xs shadow-xl shadow-emerald-600/20 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ShieldCheck size={18} />
          )}
          <span>{isSubmitting ? "Submitting Request…" : "Submit Reservation Request"}</span>
        </Button>
      </div>

      {/* Official Endorsement Letter Template Preview Modal */}
      <EndorsementLetterTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        requirement={activeTemplate}
        initialType={templateType}
      />

      {/* Official DOCX Template Viewer Modal */}
      <DocxPreviewModal
        isOpen={showDocxModal}
        onClose={() => {
          setShowDocxModal(false);
          setSelectedDocx({ url: "", name: "", title: "" });
        }}
        fileUrl={selectedDocx.url}
        fileName={selectedDocx.name}
        title={selectedDocx.title}
      />

      {/* ── Interactive Webcam / Camera Capture Modal ── */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-blue-900/60 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col space-y-0">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Camera size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Capture Document Photo
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Align your signed endorsement letter within the frame
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCameraModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Viewfinder / Preview Box */}
            <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
              {capturedPhotoUrl ? (
                <img
                  src={capturedPhotoUrl}
                  alt="Captured document snapshot"
                  className="w-full h-full object-contain"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Framing Guideline */}
                  <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-white/50 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                    <span className="text-[10px] font-mono font-bold text-white/80 bg-black/40 px-2 py-0.5 rounded self-start backdrop-blur-xs">
                      Document Frame
                    </span>
                    <span className="text-[10px] font-medium text-white/70 bg-black/40 px-2 py-0.5 rounded self-center text-center backdrop-blur-xs">
                      Ensure text and signatures are clearly legible
                    </span>
                  </div>
                </>
              )}

              {/* Hidden Canvas for Frame Capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Camera Error Display */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/90 p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
                  <Camera size={36} className="text-rose-400" />
                  <p className="text-xs font-bold text-white max-w-sm">
                    {cameraError}
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => mobileCameraInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Use Native Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => startCameraStream(selectedCameraId)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* Starting Camera Spinner */}
              {isStartingCamera && !cameraError && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center space-y-2 z-10">
                  <Loader2 size={28} className="animate-spin text-white" />
                  <span className="text-xs font-bold text-white">Opening camera…</span>
                </div>
              )}
            </div>

            {/* Modal Controls Bar */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2">
                {cameraDevices.length > 1 && !capturedPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentIdx = cameraDevices.findIndex(d => d.deviceId === selectedCameraId);
                      const nextDevice = cameraDevices[(currentIdx + 1) % cameraDevices.length];
                      if (nextDevice) {
                        setSelectedCameraId(nextDevice.deviceId);
                        startCameraStream(nextDevice.deviceId);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
                    title="Switch Camera (Front/Back)"
                  >
                    <RefreshCw size={13} />
                    <span>Flip</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {capturedPhotoUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCapturedPhotoUrl(null);
                        startCameraStream(selectedCameraId);
                      }}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptCapturedPhoto}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-colors"
                    >
                      <Check size={14} />
                      <span>Attach Photo</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSnapPhoto}
                    disabled={isStartingCamera || !!cameraError}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer transition-all hover:scale-105"
                  >
                    <Camera size={16} />
                    <span>Take Snapshot</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flat In-App Alert Modal (replaces native window.alert()) */}
      <AlertModal
        open={alertModal.open}
        onClose={() => setAlertModal((prev) => ({ ...prev, open: false }))}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  );
}
