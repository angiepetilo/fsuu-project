import React, { useState, useEffect } from "react";
import { X, Copy, Check, Edit3, Save, RotateCcw } from "lucide-react";
import notify from "@/lib/notify";

const DEFAULT_ORG_TEMPLATE = `FATHER SATURNINO URIOS UNIVERSITY
San Francisco Street, Butuan City, 8600, Philippines
Office of Institutional Student Affairs & Activities (OISAA) & Property Management Office (PMO)

Date: [ Date of Request ]

FOR:     THE DIRECTOR
         Office of Institutional Student Affairs & Activities (OISAA)

THROUGH: THE DEAN
         [ Dean of Department e.g., CTE / CCIS / CEA / CBA / CAS / CON ]

         THE DIRECTOR
         Property Management Office (PMO)
         [ Name of PMO Director ]

FROM:    [ Name of Student Organization ]
SUBJECT: Formal Request for Venue Reservation & Endorsement (AVR Facilities)

Dear Sir/Madam:

Peace and all good!

The student officers and members of [ Name of Student Organization ] respectfully request permission and official endorsement for the reservation and use of the [ Requested Venue Name e.g., Audio-Visual Room (AVR) 1 / AVR 2 / Gym ] on [ Date of Usage ] from [ Start Time ] to [ End Time ].

The facility will be utilized for our scheduled activity:
- Event / Purpose: [ Insert Title of Activity / Purpose ]
- Expected Participants: [ Number of Attendees ]
- Required Equipment: [ e.g., Projector, Microphones, Sound System ]

We ensure that all university rules, safety protocols, cleanliness, and physical facility care regulations will be strictly maintained before, during, and after the event.

Respectfully yours in St. Urios,

_____________________________________          _____________________________________
[ Name of Organization President ]             [ Name of Faculty Adviser / Moderator ]
President / Lead Applicant                     Faculty Moderator / Adviser
[ Name of Student Organization ]               [ Department / Office ]


ENDORSED & RECOMMENDED BY:

_____________________________________          _____________________________________
[ Name of Dean ]                               [ Name of OISAA Director ]
Dean, [ Department / College Name ]            Director, Office of Institutional Student Affairs
Father Saturnino Urios University              Father Saturnino Urios University


FACILITY CLEARANCE & FINAL APPROVAL:

_____________________________________
[ Name of PMO Director ]
Director, Property Management Office (PMO)
Father Saturnino Urios University`;

const DEFAULT_ACAD_TEMPLATE = `FATHER SATURNINO URIOS UNIVERSITY
San Francisco Street, Butuan City, 8600, Philippines
Office of the Vice President for Academic and Student Affairs (OVPASA) & Property Management Office (PMO)

Date: [ Date of Request ]

FOR:     THE VICE PRESIDENT FOR ACADEMIC AND STUDENT AFFAIRS
         Office of the VP for Academic & Student Affairs (OVPASA)

THROUGH: THE DEAN
         [ Dean of Department e.g., CTE / CCIS / CBA / CAS / CON / CEA ]

         THE DIRECTOR
         Property Management Office (PMO)
         [ Name of PMO Director ]

FROM:    [ Name of Faculty Member / Department Chair / Requestor ]
SUBJECT: Formal Request for Venue Reservation for Academic / Curricular Activity

Dear Vice President:

Greetings of Peace!

The Department of [ Academic Department Name ] respectfully requests authorization and facility endorsement to reserve and utilize the [ Requested Venue Name e.g., Audio-Visual Room (AVR) 1 / AVR 2 ] on [ Date of Usage ] from [ Start Time ] to [ End Time ].

This reservation is required for the conduct of our academic event / curricular activity:
- Course / Subject / Purpose: [ Course or Activity Title ]
- Target Cohort / Class: [ Target Class and Estimated Attendees ]
- Required Facilities: [ Multimedia Projector, Audio, Air-conditioning ]

All participants will strictly abide by university academic guidelines and facility usage policies.

Respectfully yours,

_____________________________________
[ Name of Requestor / Faculty In-Charge ]
[ Faculty / Department Chair ]
[ Department / College Name ]


ENDORSED & SIGNED BY:

_____________________________________
[ Name of Dean ]
Dean, [ Department / College Name ]
Father Saturnino Urios University


APPROVED BY:

_____________________________________
[ Name of OVPASA Vice President ]
Vice President for Academic & Student Affairs
Father Saturnino Urios University


FACILITY CLEARANCE & VENUE SCHEDULING:

_____________________________________
[ Name of PMO Director ]
Director, Property Management Office (PMO)
Father Saturnino Urios University`;

export default function EndorsementLetterTemplateModal({
  isOpen,
  onClose,
  initialType = "organization",
  allowEdit = false,
  showTypeTabs = false,
}) {
  const [activeType, setActiveType] = useState(initialType || "organization");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [orgTemplate, setOrgTemplate] = useState(() => {
    return localStorage.getItem("fsuu_letter_tpl_org") || DEFAULT_ORG_TEMPLATE;
  });

  const [acadTemplate, setAcadTemplate] = useState(() => {
    return localStorage.getItem("fsuu_letter_tpl_acad") || DEFAULT_ACAD_TEMPLATE;
  });

  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (initialType) {
      setActiveType(initialType.toLowerCase().includes("acad") ? "academic" : "organization");
    }
  }, [initialType, isOpen]);

  useEffect(() => {
    setIsEditing(false);
  }, [activeType, isOpen]);

  if (!isOpen) return null;

  const isOrg = activeType === "organization";
  const currentTemplate = isOrg ? orgTemplate : acadTemplate;

  const handleStartEdit = () => {
    setEditText(currentTemplate);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveChanges = () => {
    if (isOrg) {
      setOrgTemplate(editText);
      localStorage.setItem("fsuu_letter_tpl_org", editText);
    } else {
      setAcadTemplate(editText);
      localStorage.setItem("fsuu_letter_tpl_acad", editText);
    }
    setIsEditing(false);
    notify.success("Changes Saved", "Letter template changes saved successfully.");
  };

  const handleResetDefault = () => {
    if (!confirm("Reset this template back to official default format?")) return;
    if (isOrg) {
      setOrgTemplate(DEFAULT_ORG_TEMPLATE);
      localStorage.removeItem("fsuu_letter_tpl_org");
      if (isEditing) setEditText(DEFAULT_ORG_TEMPLATE);
    } else {
      setAcadTemplate(DEFAULT_ACAD_TEMPLATE);
      localStorage.removeItem("fsuu_letter_tpl_acad");
      if (isEditing) setEditText(DEFAULT_ACAD_TEMPLATE);
    }
    notify.success("Template Reset", "Template restored to default format.");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(isEditing ? editText : currentTemplate);
    setCopied(true);
    notify.success("Copied", "Letter format copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto text-slate-900 font-sans animate-in zoom-in-95 duration-200">
        
        {/* Clean Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 bg-white">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
              {isOrg ? "Organization Endorsement Letter Format" : "Academic Endorsement Letter Format"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Official university format structure for venue reservation requests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Show Switcher Tabs ONLY if explicitly requested */}
            {showTypeTabs && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) handleCancelEdit();
                    setActiveType("organization");
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    isOrg
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Organization
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) handleCancelEdit();
                    setActiveType("academic");
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    !isOrg
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Academic
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs bg-slate-50 shrink-0">
          <span className="font-bold text-slate-700">
            {isOrg ? "Student Organization Endorsement Template" : "Academic / Curricular Endorsement Template"}
          </span>

          <div className="flex items-center gap-2">
            {allowEdit && !isEditing ? (
              <button
                type="button"
                onClick={handleStartEdit}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-md font-medium transition-colors cursor-pointer"
              >
                <Edit3 size={13} />
                <span>Edit</span>
              </button>
            ) : null}

            {!isEditing ? (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-xs cursor-pointer"
              >
                {copied ? <Check size={13} className="text-white" /> : <Copy size={13} />}
                <span>{copied ? "Copied to Clipboard" : "Copy Format"}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md font-medium transition-colors cursor-pointer"
                  title="Reset to default format"
                >
                  <RotateCcw size={13} />
                  <span>Reset Default</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-md font-medium cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <Save size={13} />
                  <span>Save Changes</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {isEditing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={22}
              className="w-full p-4 border border-slate-300 rounded-lg font-mono text-xs text-slate-900 leading-relaxed focus:outline-none focus:border-slate-600 bg-slate-50 resize-y"
              placeholder="Enter endorsement letter format here..."
            />
          ) : (
            <div className="border border-slate-200 rounded-xl p-6 font-mono text-xs text-slate-900 leading-relaxed whitespace-pre-wrap select-text bg-slate-50/50">
              {currentTemplate}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs bg-slate-50 shrink-0">
          <span className="text-slate-500 font-medium">
            Format ready for copying into Word or Google Docs.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
