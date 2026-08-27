import React, { useState, useEffect } from "react";
import { X, Download, Edit3, Save, RotateCcw } from "lucide-react";
import notify from "@/lib/notify";
import { FSUU_LOGO_BASE64 } from "@/lib/fsuuLogoBase64";

const DEFAULT_ORG_CONFIG = {
  dateLabel: "Date: [ Date of Request ]",
  forTitle: "THE DIRECTOR\nOffice of Institutional Student Affairs & Activities (OISAA)",
  throughTitle: "THE DEAN\n[ Dean of Department e.g., CTE / CCIS / CEA / CBA / CAS / CON ]\n\nTHE DIRECTOR\nProperty Management Office (PMO)\n[ Name of PMO Director ]",
  fromTitle: "[ Name of Student Organization / Requestor ]",
  subject: "Formal Request for Venue Reservation & Endorsement (AVR Facilities)",
  salutation: "Dear Sir/Madam:",
  opening: "Peace and all good!\n\nThe student officers and members of [ Name of Student Organization ] respectfully request permission and official endorsement for the reservation and use of the [ Requested Venue Name e.g., Audio-Visual Room (AVR) 1 / AVR 2 / Gym ] on [ Date of Usage ] from [ Start Time ] to [ End Time ].",
  activityDetails: "• Event / Purpose: [ Insert Title of Activity / Purpose ]\n• Expected Participants: [ Number of Attendees ]\n• Required Equipment: [ e.g., Projector, Microphones, Sound System ]",
  complianceNote: "We ensure that all university rules, safety protocols, cleanliness, and physical facility care regulations will be strictly maintained before, during, and after the event.",
  closing: "Respectfully yours in St. Urios,",
  signatoryLeft: {
    name: "[ Name of Organization President ]",
    title: "President / Lead Applicant",
    sub: "[ Name of Student Organization ]",
  },
  signatoryRight: {
    name: "[ Name of Faculty Adviser / Moderator ]",
    title: "Faculty Moderator / Adviser",
    sub: "[ Department / Office ]",
  },
  endorsementLabel: "ENDORSED & RECOMMENDED BY:",
  endorseLeft: {
    name: "[ Name of Dean ]",
    title: "Dean, [ Department / College Name ]",
    sub: "Father Saturnino Urios University",
  },
  endorseRight: {
    name: "[ Name of OISAA Director ]",
    title: "Director, Office of Institutional Student Affairs & Activities",
    sub: "Father Saturnino Urios University",
  },
  approvalLabel: "FACILITY CLEARANCE & FINAL APPROVAL:",
  approver: {
    name: "[ Name of PMO Director ]",
    title: "Director, Property Management Office (PMO)",
    sub: "Father Saturnino Urios University",
  },
};

const DEFAULT_ACAD_CONFIG = {
  dateLabel: "Date: [ Date of Request ]",
  forTitle: "THE VICE PRESIDENT FOR ACADEMIC AND STUDENT AFFAIRS\nOffice of the VP for Academic & Student Affairs (OVPASA)",
  throughTitle: "THE DEAN\n[ Dean of Department e.g., CTE / CCIS / CBA / CAS / CON / CEA ]\n\nTHE DIRECTOR\nProperty Management Office (PMO)\n[ Name of PMO Director ]",
  fromTitle: "[ Name of Faculty Member / Department Chair / Requestor ]",
  subject: "Formal Request for Venue Reservation for Academic / Curricular Activity",
  salutation: "Dear Vice President:",
  opening: "Greetings of Peace!\n\nThe Department of [ Academic Department Name ] respectfully requests authorization and facility endorsement to reserve and utilize the [ Requested Venue Name e.g., Audio-Visual Room (AVR) 1 / AVR 2 ] on [ Date of Usage ] from [ Start Time ] to [ End Time ].",
  activityDetails: "• Course / Subject / Purpose: [ Course or Activity Title ]\n• Target Cohort / Class: [ Target Class and Estimated Attendees ]\n• Required Facilities: [ Multimedia Projector, Audio, Air-conditioning ]",
  complianceNote: "All participants will strictly abide by university academic guidelines and facility usage policies.",
  closing: "Respectfully yours,",
  signatoryLeft: {
    name: "[ Name of Requestor / Faculty In-Charge ]",
    title: "[ Faculty / Department Chair ]",
    sub: "[ Department / College Name ]",
  },
  signatoryRight: {
    name: "",
    title: "",
    sub: "",
  },
  endorsementLabel: "ENDORSED & SIGNED BY:",
  endorseLeft: {
    name: "[ Name of Dean ]",
    title: "Dean, [ Department / College Name ]",
    sub: "Father Saturnino Urios University",
  },
  endorseRight: {
    name: "",
    title: "",
    sub: "",
  },
  approvalLabel: "APPROVED BY:",
  approver: {
    name: "[ Name of OVPASA Vice President ]",
    title: "Vice President for Academic & Student Affairs",
    sub: "Father Saturnino Urios University",
  },
  finalClearanceLabel: "FACILITY CLEARANCE & VENUE SCHEDULING:",
  finalClearance: {
    name: "[ Name of PMO Director ]",
    title: "Director, Property Management Office (PMO)",
    sub: "Father Saturnino Urios University",
  },
};

export default function EndorsementLetterTemplateModal({
  isOpen,
  onClose,
  initialType = "organization",
  allowEdit = false,
  showTypeTabs = false,
  departmentName = "",
}) {
  const [activeType, setActiveType] = useState(initialType || "organization");
  const [isEditing, setIsEditing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editTab, setEditTab] = useState("body");

  const [orgConfig, setOrgConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_letter_cfg_org_v3");
      return saved ? JSON.parse(saved) : DEFAULT_ORG_CONFIG;
    } catch {
      return DEFAULT_ORG_CONFIG;
    }
  });

  const [acadConfig, setAcadConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("fsuu_letter_cfg_acad_v3");
      return saved ? JSON.parse(saved) : DEFAULT_ACAD_CONFIG;
    } catch {
      return DEFAULT_ACAD_CONFIG;
    }
  });

  const [editConfig, setEditConfig] = useState(DEFAULT_ORG_CONFIG);

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
  const currentConfig = isOrg ? orgConfig : acadConfig;

  const handleStartEdit = () => {
    setEditConfig(JSON.parse(JSON.stringify(currentConfig)));
    setIsEditing(true);
    setEditTab("body");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveChanges = () => {
    if (isOrg) {
      setOrgConfig(editConfig);
      localStorage.setItem("fsuu_letter_cfg_org_v3", JSON.stringify(editConfig));
    } else {
      setAcadConfig(editConfig);
      localStorage.setItem("fsuu_letter_cfg_acad_v3", JSON.stringify(editConfig));
    }
    setIsEditing(false);
    notify.success("Template Saved", "Letter template saved successfully.");
  };

  const handleResetDefault = () => {
    if (!confirm("Reset this template back to official default format?")) return;
    if (isOrg) {
      setOrgConfig(DEFAULT_ORG_CONFIG);
      localStorage.removeItem("fsuu_letter_cfg_org_v3");
      setEditConfig(DEFAULT_ORG_CONFIG);
    } else {
      setAcadConfig(DEFAULT_ACAD_CONFIG);
      localStorage.removeItem("fsuu_letter_cfg_acad_v3");
      setEditConfig(DEFAULT_ACAD_CONFIG);
    }
    notify.success("Template Reset", "Template restored to official default format.");
  };

  const handleDownloadDoc = () => {
    setDownloading(true);
    const cfg = isEditing ? editConfig : currentConfig;
    const filename = isOrg 
      ? "FSUU_Student_Organization_Endorsement_Letter.doc"
      : "FSUU_Academic_Endorsement_Letter.doc";

    const officeSubTitle = isOrg
      ? "Office of Institutional Student Affairs & Activities (OISAA)"
      : "Office of the Vice President for Academic and Student Affairs (OVPASA)";

    // Generates compact, single-page Word HTML with exact tables, 0.75in margins, and 1.15 line pitch
    const formattedHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <title>FSUU Endorsement Letter</title>
        <style>
          @page Section1 {
            size: 8.5in 11.0in;
            margin: 0.65in 0.75in 0.65in 0.75in;
            mso-header-margin: 0.25in;
            mso-footer-margin: 0.25in;
            mso-page-orientation: portrait;
            mso-paper-source: 0;
          }
          div.Section1 {
            page: Section1;
            font-family: 'Times New Roman', serif;
            font-size: 10.5pt;
            line-height: 1.18;
            color: #000000;
          }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 10.5pt;
            line-height: 1.18;
            color: #000000;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2pt;
          }
          .univ-title {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            font-weight: bold;
            color: #0f2c59;
            text-transform: uppercase;
            text-align: center;
            margin: 0;
            letter-spacing: 0.5pt;
          }
          .univ-sub {
            font-family: 'Times New Roman', serif;
            font-size: 8.5pt;
            color: #475569;
            text-align: center;
            margin: 1pt 0;
          }
          .office-title {
            font-family: 'Times New Roman', serif;
            font-size: 9.5pt;
            font-weight: bold;
            color: #1e3a8a;
            text-align: center;
            margin: 1.5pt 0;
          }
          .divider {
            border-top: 1.5pt solid #0f2c59;
            border-bottom: 0.5pt solid #0f2c59;
            height: 2px;
            margin: 3pt 0 10pt 0;
          }
          .memo-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8pt;
            font-family: 'Times New Roman', serif;
            font-size: 10.5pt;
          }
          .memo-table td {
            padding: 1.5pt 0;
            vertical-align: top;
            font-family: 'Times New Roman', serif;
            font-size: 10.5pt;
            line-height: 1.18;
          }
          .memo-label {
            width: 90px;
            font-weight: bold;
          }
          .body-p {
            margin: 0 0 5pt 0;
            text-align: justify;
            font-family: 'Times New Roman', serif;
            font-size: 10.5pt;
            line-height: 1.18;
          }
          .bullet-p {
            margin: 0 0 3pt 18pt;
            font-family: 'Times New Roman', serif;
            font-size: 10.5pt;
            line-height: 1.18;
          }
          .signatory-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14pt;
          }
          .signatory-table td {
            width: 48%;
            vertical-align: top;
            padding-right: 15pt;
          }
          .sign-line {
            border-bottom: 1pt solid #000000;
            width: 100%;
            height: 22pt;
            margin-bottom: 3pt;
          }
          .sign-name {
            font-family: 'Times New Roman', serif;
            font-weight: bold;
            font-size: 10pt;
            margin: 0;
            line-height: 1.15;
          }
          .sign-title {
            font-family: 'Times New Roman', serif;
            font-size: 9pt;
            color: #334155;
            margin: 0;
            line-height: 1.15;
          }
          .sign-sub {
            font-family: 'Times New Roman', serif;
            font-size: 8.5pt;
            color: #64748b;
            margin: 0;
            line-height: 1.15;
          }
          .section-heading {
            font-family: 'Times New Roman', serif;
            font-weight: bold;
            font-size: 9.5pt;
            color: #0f172a;
            margin: 12pt 0 4pt 0;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          <!-- Institutional Header -->
          <table class="header-table" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="70" align="left" valign="middle">
                <img src="${FSUU_LOGO_BASE64}" width="65" height="65" alt="FSUU Logo" style="display:block; width:65px; height:65px;" />
              </td>
              <td align="center" valign="middle">
                <p class="univ-title">Father Saturnino Urios University</p>
                <p class="univ-sub">San Francisco Street, Butuan City, 8600, Philippines</p>
                <p class="office-title">${officeSubTitle}</p>
                <p class="univ-sub">Property Management Office (PMO) — Audio Visual Resource</p>
              </td>
              <td width="70" align="right" valign="middle">
                <!-- Reserved for Department Logo -->
              </td>
            </tr>
          </table>
          <div class="divider"></div>

          <!-- Memo Routing Block -->
          <p style="margin: 0 0 6pt 0; font-family:'Times New Roman',serif; font-size:10.5pt; font-weight: bold;">${cfg.dateLabel}</p>
          <table class="memo-table" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td class="memo-label" width="90">FOR:</td>
              <td>${cfg.forTitle.replace(/\n/g, "<br>")}</td>
            </tr>
            ${cfg.throughTitle ? `
            <tr>
              <td class="memo-label" width="90">THROUGH:</td>
              <td>${cfg.throughTitle.replace(/\n/g, "<br>")}</td>
            </tr>` : ''}
            <tr>
              <td class="memo-label" width="90">FROM:</td>
              <td>${cfg.fromTitle}</td>
            </tr>
            <tr>
              <td class="memo-label" width="90">SUBJECT:</td>
              <td style="font-weight: bold;">${cfg.subject}</td>
            </tr>
          </table>

          <p class="body-p" style="margin-top: 8pt;">${cfg.salutation}</p>
          <p class="body-p">${cfg.opening.replace(/\n\n/g, "</p><p class='body-p'>").replace(/\n/g, "<br>")}</p>
          
          <div>
            ${cfg.activityDetails.split('\n').map(line => `<p class="bullet-p">${line}</p>`).join('')}
          </div>

          <p class="body-p" style="margin-top: 5pt;">${cfg.complianceNote.replace(/\n/g, "<br>")}</p>
          <p class="body-p" style="margin-top: 8pt;">${cfg.closing}</p>

          <!-- Signatories 2-Column Table -->
          <table class="signatory-table" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="48%" align="left" valign="top">
                <div class="sign-line"></div>
                <p class="sign-name">${cfg.signatoryLeft.name}</p>
                <p class="sign-title">${cfg.signatoryLeft.title}</p>
                <p class="sign-sub">${cfg.signatoryLeft.sub}</p>
              </td>
              ${cfg.signatoryRight?.name ? `
              <td width="48%" align="left" valign="top">
                <div class="sign-line"></div>
                <p class="sign-name">${cfg.signatoryRight.name}</p>
                <p class="sign-title">${cfg.signatoryRight.title}</p>
                <p class="sign-sub">${cfg.signatoryRight.sub}</p>
              </td>` : '<td width="48%"></td>'}
            </tr>
          </table>

          <!-- Endorsement Section -->
          ${cfg.endorsementLabel ? `
          <p class="section-heading">${cfg.endorsementLabel}</p>
          <table class="signatory-table" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 4pt;">
            <tr>
              <td width="48%" align="left" valign="top">
                <div class="sign-line"></div>
                <p class="sign-name">${cfg.endorseLeft.name}</p>
                <p class="sign-title">${cfg.endorseLeft.title}</p>
                <p class="sign-sub">${cfg.endorseLeft.sub}</p>
              </td>
              ${cfg.endorseRight?.name ? `
              <td width="48%" align="left" valign="top">
                <div class="sign-line"></div>
                <p class="sign-name">${cfg.endorseRight.name}</p>
                <p class="sign-title">${cfg.endorseRight.title}</p>
                <p class="sign-sub">${cfg.endorseRight.sub}</p>
              </td>` : '<td width="48%"></td>'}
            </tr>
          </table>` : ''}

          <!-- Approval Section -->
          ${cfg.approvalLabel && cfg.approver ? `
          <p class="section-heading">${cfg.approvalLabel}</p>
          <table class="signatory-table" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 4pt;">
            <tr>
              <td width="48%" align="left" valign="top">
                <div class="sign-line"></div>
                <p class="sign-name">${cfg.approver.name}</p>
                <p class="sign-title">${cfg.approver.title}</p>
                <p class="sign-sub">${cfg.approver.sub}</p>
              </td>
              <td width="48%"></td>
            </tr>
          </table>` : ''}

          ${cfg.finalClearanceLabel && cfg.finalClearance ? `
          <p class="section-heading">${cfg.finalClearanceLabel}</p>
          <table class="signatory-table" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 4pt;">
            <tr>
              <td width="48%" align="left" valign="top">
                <div class="sign-line"></div>
                <p class="sign-name">${cfg.finalClearance.name}</p>
                <p class="sign-title">${cfg.finalClearance.title}</p>
                <p class="sign-sub">${cfg.finalClearance.sub}</p>
              </td>
              <td width="48%"></td>
            </tr>
          </table>` : ''}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', formattedHtml], {
      type: 'application/msword;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notify.success("Document Downloaded", `Endorsement letter downloaded as ${filename}`);
    setDownloading(false);
  };

  const previewConfig = isEditing ? editConfig : currentConfig;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[2000] flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-4xl w-full shadow-xl border border-slate-200 space-y-4 max-h-[92vh] flex flex-col animate-in zoom-in-95">
        
        {/* Clean Sleek Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Endorsement Letter Format
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Official university format structure for venue reservation requests.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Minimal Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          
          {/* Tabs for Org vs Academic */}
          <div className="flex items-center gap-2">
            {showTypeTabs && (
              <div className="flex gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) setEditConfig(DEFAULT_ORG_CONFIG);
                    setActiveType("organization");
                  }}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    isOrg
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Student Organization
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) setEditConfig(DEFAULT_ACAD_CONFIG);
                    setActiveType("academic");
                  }}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    !isOrg
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Academic
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {allowEdit && !isEditing && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              >
                Edit Template
              </button>
            )}

            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                  title="Reset to Default"
                >
                  Reset Default
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleDownloadDoc}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Download size={13} />
                <span>{downloading ? "Downloading..." : "Download as DOCS"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        {isEditing ? (
          /* ── Structured Sectional Editor ── */
          <div className="flex-1 min-h-[400px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
            
            {/* Minimal Section Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEditTab("routing")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  editTab === "routing" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                1. Routing &amp; Memo
              </button>
              <button
                type="button"
                onClick={() => setEditTab("body")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  editTab === "body" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                2. Letter Body
              </button>
              <button
                type="button"
                onClick={() => setEditTab("signatories")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  editTab === "signatories" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                3. Signatories
              </button>
            </div>

            {/* TAB 1: Routing */}
            {editTab === "routing" && (
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Format</label>
                  <input
                    type="text"
                    value={editConfig.dateLabel}
                    onChange={(e) => setEditConfig({ ...editConfig, dateLabel: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">FOR: Recipient</label>
                  <textarea
                    rows={2}
                    value={editConfig.forTitle}
                    onChange={(e) => setEditConfig({ ...editConfig, forTitle: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-slate-900 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">THROUGH: Endorsement Route</label>
                  <textarea
                    rows={2}
                    value={editConfig.throughTitle}
                    onChange={(e) => setEditConfig({ ...editConfig, throughTitle: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-slate-900 font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">FROM: Applicant</label>
                    <input
                      type="text"
                      value={editConfig.fromTitle}
                      onChange={(e) => setEditConfig({ ...editConfig, fromTitle: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">SUBJECT</label>
                    <input
                      type="text"
                      value={editConfig.subject}
                      onChange={(e) => setEditConfig({ ...editConfig, subject: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded text-slate-900 font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Body */}
            {editTab === "body" && (
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Salutation</label>
                  <input
                    type="text"
                    value={editConfig.salutation}
                    onChange={(e) => setEditConfig({ ...editConfig, salutation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Request Paragraph</label>
                  <textarea
                    rows={4}
                    value={editConfig.opening}
                    onChange={(e) => setEditConfig({ ...editConfig, opening: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-slate-900 font-mono text-xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Activity Specification Bullets</label>
                  <textarea
                    rows={3}
                    value={editConfig.activityDetails}
                    onChange={(e) => setEditConfig({ ...editConfig, activityDetails: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-slate-900 font-mono text-xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Policy &amp; Care Statement</label>
                  <textarea
                    rows={2}
                    value={editConfig.complianceNote}
                    onChange={(e) => setEditConfig({ ...editConfig, complianceNote: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-slate-900 font-mono text-xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Complimentary Close</label>
                  <input
                    type="text"
                    value={editConfig.closing}
                    onChange={(e) => setEditConfig({ ...editConfig, closing: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: Signatories */}
            {editTab === "signatories" && (
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4 text-xs">
                <h5 className="font-bold text-slate-900 uppercase text-[11px]">
                  Lead Signatories
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-slate-700">Left: Primary Applicant</p>
                    <input
                      type="text"
                      placeholder="Name"
                      value={editConfig.signatoryLeft.name}
                      onChange={(e) => setEditConfig({ ...editConfig, signatoryLeft: { ...editConfig.signatoryLeft, name: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="Title"
                      value={editConfig.signatoryLeft.title}
                      onChange={(e) => setEditConfig({ ...editConfig, signatoryLeft: { ...editConfig.signatoryLeft, title: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="Organization"
                      value={editConfig.signatoryLeft.sub}
                      onChange={(e) => setEditConfig({ ...editConfig, signatoryLeft: { ...editConfig.signatoryLeft, sub: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="font-semibold text-slate-700">Right: Faculty Adviser</p>
                    <input
                      type="text"
                      placeholder="Name"
                      value={editConfig.signatoryRight?.name || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, signatoryRight: { ...editConfig.signatoryRight, name: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="Title"
                      value={editConfig.signatoryRight?.title || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, signatoryRight: { ...editConfig.signatoryRight, title: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="Department"
                      value={editConfig.signatoryRight?.sub || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, signatoryRight: { ...editConfig.signatoryRight, sub: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
                    />
                  </div>
                </div>

                <h5 className="font-bold text-slate-900 uppercase text-[11px] pt-2">
                  Endorsements
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-slate-700">Left Endorsement</p>
                    <input
                      type="text"
                      placeholder="Name"
                      value={editConfig.endorseLeft?.name || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, endorseLeft: { ...editConfig.endorseLeft, name: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="Title"
                      value={editConfig.endorseLeft?.title || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, endorseLeft: { ...editConfig.endorseLeft, title: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="font-semibold text-slate-700">Right Endorsement</p>
                    <input
                      type="text"
                      placeholder="Name"
                      value={editConfig.endorseRight?.name || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, endorseRight: { ...editConfig.endorseRight, name: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="Title"
                      value={editConfig.endorseRight?.title || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, endorseRight: { ...editConfig.endorseRight, title: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
                    />
                  </div>
                </div>

                <h5 className="font-bold text-slate-900 uppercase text-[11px] pt-2">
                  Final Approval Authority
                </h5>
                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5 max-w-sm">
                  <input
                    type="text"
                    placeholder="Approver Name"
                    value={editConfig.approver?.name || ""}
                    onChange={(e) => setEditConfig({ ...editConfig, approver: { ...editConfig.approver, name: e.target.value } })}
                    className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Approver Title"
                    value={editConfig.approver?.title || ""}
                    onChange={(e) => setEditConfig({ ...editConfig, approver: { ...editConfig.approver, title: e.target.value } })}
                    className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
                  />
                </div>
              </div>
            )}

          </div>
        ) : (
          /* ── Compact 1-Page Sheet Preview ── */
          <div className="flex-1 min-h-[400px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
            <div className="max-w-[650px] mx-auto bg-white shadow-xs border border-slate-200 rounded-lg p-6 sm:p-8 space-y-3.5 select-text font-serif text-slate-900 leading-normal text-xs sm:text-[12.5px]">
              
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-2.5">
                <div className="flex items-center justify-between gap-3">
                  
                  {/* Left: Logo */}
                  <div className="w-14 h-14 flex items-center justify-center shrink-0">
                    <img
                      src="/fsuu_logo.png"
                      alt="FSUU Seal"
                      className="h-14 w-auto object-contain"
                    />
                  </div>

                  {/* Center: University Details */}
                  <div className="flex-1 text-center space-y-0.5 min-w-0 font-sans">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-[13px] uppercase tracking-wide">
                      Father Saturnino Urios University
                    </h4>
                    <p className="text-[9.5px] text-slate-500 font-medium">
                      San Francisco Street, Butuan City, 8600, Philippines
                    </p>
                    <p className="text-[10px] font-bold text-blue-900">
                      {isOrg ? "Office of Institutional Student Affairs & Activities (OISAA)" : "Office of the Vice President for Academic and Student Affairs (OVPASA)"}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium">
                      Property Management Office (PMO) — Audio Visual Resource
                    </p>
                  </div>

                  {/* Right: Department Spacer */}
                  <div className="w-14 h-14 shrink-0"></div>

                </div>
              </div>

              {/* Memo Routing */}
              <div className="font-mono text-[11.5px] space-y-0.5 text-slate-900">
                <p className="font-bold mb-1.5">{previewConfig.dateLabel}</p>
                <div className="grid grid-cols-[75px_1fr] gap-1">
                  <span className="font-bold text-slate-600">FOR:</span>
                  <span className="whitespace-pre-line">{previewConfig.forTitle}</span>
                </div>
                {previewConfig.throughTitle && (
                  <div className="grid grid-cols-[75px_1fr] gap-1 pt-0.5">
                    <span className="font-bold text-slate-600">THROUGH:</span>
                    <span className="whitespace-pre-line">{previewConfig.throughTitle}</span>
                  </div>
                )}
                <div className="grid grid-cols-[75px_1fr] gap-1 pt-0.5">
                  <span className="font-bold text-slate-600">FROM:</span>
                  <span>{previewConfig.fromTitle}</span>
                </div>
                <div className="grid grid-cols-[75px_1fr] gap-1 pt-0.5">
                  <span className="font-bold text-slate-600">SUBJECT:</span>
                  <span className="font-bold">{previewConfig.subject}</span>
                </div>
              </div>

              {/* Body Text */}
              <div className="font-mono text-[11.5px] text-slate-800 space-y-2 leading-relaxed">
                <p>{previewConfig.salutation}</p>
                <p className="whitespace-pre-line">{previewConfig.opening}</p>
                <div className="pl-3 py-0.5 border-l-2 border-slate-200 whitespace-pre-line text-slate-700 text-[11px]">
                  {previewConfig.activityDetails}
                </div>
                <p className="whitespace-pre-line">{previewConfig.complianceNote}</p>
                <p className="pt-0.5">{previewConfig.closing}</p>
              </div>

              {/* Signatures */}
              <div className="pt-2 font-mono text-[11px]">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="border-b border-slate-900 w-full mb-1 h-5"></div>
                    <p className="font-bold text-slate-900">{previewConfig.signatoryLeft.name}</p>
                    <p className="text-[10px] text-slate-600">{previewConfig.signatoryLeft.title}</p>
                    <p className="text-[9.5px] text-slate-400">{previewConfig.signatoryLeft.sub}</p>
                  </div>
                  {previewConfig.signatoryRight?.name && (
                    <div>
                      <div className="border-b border-slate-900 w-full mb-1 h-5"></div>
                      <p className="font-bold text-slate-900">{previewConfig.signatoryRight.name}</p>
                      <p className="text-[10px] text-slate-600">{previewConfig.signatoryRight.title}</p>
                      <p className="text-[9.5px] text-slate-400">{previewConfig.signatoryRight.sub}</p>
                    </div>
                  )}
                </div>

                {/* Endorsement */}
                {previewConfig.endorsementLabel && (
                  <div className="mt-3.5">
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {previewConfig.endorsementLabel}
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="border-b border-slate-900 w-full mb-1 h-5"></div>
                        <p className="font-bold text-slate-900">{previewConfig.endorseLeft?.name}</p>
                        <p className="text-[10px] text-slate-600">{previewConfig.endorseLeft?.title}</p>
                        <p className="text-[9.5px] text-slate-400">{previewConfig.endorseLeft?.sub}</p>
                      </div>
                      {previewConfig.endorseRight?.name && (
                        <div>
                          <div className="border-b border-slate-900 w-full mb-1 h-5"></div>
                          <p className="font-bold text-slate-900">{previewConfig.endorseRight?.name}</p>
                          <p className="text-[10px] text-slate-600">{previewConfig.endorseRight?.title}</p>
                          <p className="text-[9.5px] text-slate-400">{previewConfig.endorseRight?.sub}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Approval */}
                {previewConfig.approvalLabel && previewConfig.approver && (
                  <div className="mt-3.5">
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {previewConfig.approvalLabel}
                    </p>
                    <div className="max-w-[240px]">
                      <div className="border-b border-slate-900 w-full mb-1 h-5"></div>
                      <p className="font-bold text-slate-900">{previewConfig.approver.name}</p>
                      <p className="text-[10px] text-slate-600">{previewConfig.approver.title}</p>
                      <p className="text-[9.5px] text-slate-400">{previewConfig.approver.sub}</p>
                    </div>
                  </div>
                )}

                {previewConfig.finalClearanceLabel && previewConfig.finalClearance && (
                  <div className="mt-3.5">
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {previewConfig.finalClearanceLabel}
                    </p>
                    <div className="max-w-[240px]">
                      <div className="border-b border-slate-900 w-full mb-1 h-5"></div>
                      <p className="font-bold text-slate-900">{previewConfig.finalClearance.name}</p>
                      <p className="text-[10px] text-slate-600">{previewConfig.finalClearance.title}</p>
                      <p className="text-[9.5px] text-slate-400">{previewConfig.finalClearance.sub}</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          <span>Microsoft Word (.doc) single-page structured layout.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
