import React, { useState, useEffect } from "react";
import { X, Download, Edit3, Save, RotateCcw, Loader2, Plus, Trash2, Check, AlertCircle } from "lucide-react";
import notify from "@/lib/notify";
import { FSUU_LOGO_BASE64 } from "@/lib/fsuuLogoBase64";
import IosToggle from "@/components/ui/ios-toggle";

const DEFAULT_ORG_CONFIG = {
  showDate: true,
  dateLabel: "Date: [ Date of Request ]",
  showFor: true,
  forTitle: "THE DIRECTOR\nOffice of Institutional Student Affairs & Activities (OISAA)",
  showThrough: true,
  throughTitle: "THE DEAN\n[ Dean of Department e.g., CTE / CCIS / CEA / CBA / CAS / CON ]\n\nTHE DIRECTOR\nProperty Management Office (PMO)\n[ Name of PMO Director ]",
  showFrom: true,
  fromTitle: "[ Name of Student Organization / Requestor ]",
  showSubject: true,
  subject: "Formal Request for Venue Reservation & Endorsement (AVR Facilities)",
  customRouting: [],

  showSalutation: true,
  salutation: "Dear Sir/Madam:",
  showOpening: true,
  opening: "Peace and all good!\n\nThe student officers and members of [ Name of Student Organization ] respectfully request permission and official endorsement for the reservation and use of the [ Requested Venue Name e.g., Audio-Visual Room (AVR) 1 / AVR 2 / Gym ] on [ Date of Usage ] from [ Start Time ] to [ End Time ].",
  showActivityDetails: true,
  activityDetails: "• Event / Purpose: [ Insert Title of Activity / Purpose ]\n• Expected Participants: [ Number of Attendees ]\n• Required Equipment: [ e.g., Projector, Microphones, Sound System ]",
  customBodySections: [],
  showComplianceNote: true,
  complianceNote: "We ensure that all university rules, safety protocols, cleanliness, and physical facility care regulations will be strictly maintained before, during, and after the event.",
  showClosing: true,
  closing: "Respectfully yours in St. Urios,",

  showApplicantSignatories: true,
  signatoryLeft: {
    enabled: true,
    name: "[ Name of Organization President ]",
    title: "President / Lead Applicant",
    sub: "[ Name of Student Organization ]",
  },
  signatoryRight: {
    enabled: true,
    name: "[ Name of Faculty Adviser / Moderator ]",
    title: "Faculty Moderator / Adviser",
    sub: "[ Department / Office ]",
  },

  showEndorsement: true,
  endorsementLabel: "ENDORSED & RECOMMENDED BY:",
  endorseLeft: {
    enabled: true,
    name: "[ Name of Dean ]",
    title: "Dean, [ Department / College Name ]",
    sub: "Father Saturnino Urios University",
  },
  endorseRight: {
    enabled: true,
    name: "[ Name of OISAA Director ]",
    title: "Director, Office of Institutional Student Affairs & Activities",
    sub: "Father Saturnino Urios University",
  },

  showApproval: true,
  approvalLabel: "FACILITY CLEARANCE & FINAL APPROVAL:",
  approver: {
    enabled: true,
    name: "[ Name of PMO Director ]",
    title: "Director, Property Management Office (PMO)",
    sub: "Father Saturnino Urios University",
  },

  showClearance: false,
  finalClearanceLabel: "VENUE SCHEDULING CLEARANCE:",
  finalClearance: {
    enabled: false,
    name: "[ Name of PMO Custodian ]",
    title: "Facility Custodian / Scheduling Officer",
    sub: "Father Saturnino Urios University",
  },

  customSignatories: [],
};

const DEFAULT_ACAD_CONFIG = {
  showDate: true,
  dateLabel: "Date: [ Date of Request ]",
  showFor: true,
  forTitle: "THE VICE PRESIDENT FOR ACADEMIC AND STUDENT AFFAIRS\nOffice of the VP for Academic & Student Affairs (OVPASA)",
  showThrough: true,
  throughTitle: "THE DEAN\n[ Dean of Department e.g., CTE / CCIS / CBA / CAS / CON / CEA ]\n\nTHE DIRECTOR\nProperty Management Office (PMO)\n[ Name of PMO Director ]",
  showFrom: true,
  fromTitle: "[ Name of Faculty Member / Department Chair / Requestor ]",
  showSubject: true,
  subject: "Formal Request for Venue Reservation for Academic / Curricular Activity",
  customRouting: [],

  showSalutation: true,
  salutation: "Dear Vice President:",
  showOpening: true,
  opening: "Greetings of Peace!\n\nThe Department of [ Academic Department Name ] respectfully requests authorization and facility endorsement to reserve and utilize the [ Requested Venue Name e.g., Audio-Visual Room (AVR) 1 / AVR 2 ] on [ Date of Usage ] from [ Start Time ] to [ End Time ].",
  showActivityDetails: true,
  activityDetails: "• Course / Subject / Purpose: [ Course or Activity Title ]\n• Target Cohort / Class: [ Target Class and Estimated Attendees ]\n• Required Facilities: [ Multimedia Projector, Audio, Air-conditioning ]",
  customBodySections: [],
  showComplianceNote: true,
  complianceNote: "All participants will strictly abide by university academic guidelines and facility usage policies.",
  showClosing: true,
  closing: "Respectfully yours,",

  showApplicantSignatories: true,
  signatoryLeft: {
    enabled: true,
    name: "[ Name of Requestor / Faculty In-Charge ]",
    title: "[ Faculty / Department Chair ]",
    sub: "[ Department / College Name ]",
  },
  signatoryRight: {
    enabled: false,
    name: "",
    title: "",
    sub: "",
  },

  showEndorsement: true,
  endorsementLabel: "ENDORSED & SIGNED BY:",
  endorseLeft: {
    enabled: true,
    name: "[ Name of Dean ]",
    title: "Dean, [ Department / College Name ]",
    sub: "Father Saturnino Urios University",
  },
  endorseRight: {
    enabled: false,
    name: "",
    title: "",
    sub: "",
  },

  showApproval: true,
  approvalLabel: "APPROVED BY:",
  approver: {
    enabled: true,
    name: "[ Name of OVPASA Vice President ]",
    title: "Vice President for Academic & Student Affairs",
    sub: "Father Saturnino Urios University",
  },

  showClearance: true,
  finalClearanceLabel: "FACILITY CLEARANCE & VENUE SCHEDULING:",
  finalClearance: {
    enabled: true,
    name: "[ Name of PMO Director ]",
    title: "Director, Property Management Office (PMO)",
    sub: "Father Saturnino Urios University",
  },

  customSignatories: [],
};

const DEFAULT_EXTERNAL_CONFIG = {
  showDate: true,
  dateLabel: "Date: [ Date of Request ]",
  showFor: true,
  forTitle: "THE DIRECTOR\nProperty Management Office (PMO)\nFather Saturnino Urios University",
  showThrough: true,
  throughTitle: "THE VICE PRESIDENT FOR ADMINISTRATION\nFather Saturnino Urios University",
  showFrom: true,
  fromTitle: "[ External Organization / Agency / Client Name ]\n[ Contact Person & Phone / Email ]",
  showSubject: true,
  subject: "Formal Request for Facility Rental & Venue Reservation",
  customRouting: [],

  showSalutation: true,
  salutation: "Dear Director / Administration:",
  showOpening: true,
  opening: "Greetings!\n\nThe undersigned, representing [ Name of External Organization / Agency ], respectfully requests authorization and facility reservation clearance to utilize the [ Requested Venue Name e.g., Audio-Visual Room (AVR) 1 / AVR 2 / Morelos Gym ] on [ Date of Usage ] from [ Start Time ] to [ End Time ].",
  showActivityDetails: true,
  activityDetails: "• Event / Purpose: [ Insert Activity Title / Purpose ]\n• Expected Attendees: [ Number of Participants ]\n• Facility & Technical Needs: [ Projector, Sound System, Chairs, Air-conditioning ]",
  customBodySections: [],
  showComplianceNote: true,
  complianceNote: "We commit to comply with all university facility usage rules, safety protocols, and venue guidelines, and agree to settle all applicable fees upon formal reservation clearance.",
  showClosing: true,
  closing: "Respectfully yours,",

  showApplicantSignatories: true,
  signatoryLeft: {
    enabled: true,
    name: "[ Name of Authorized Client Representative ]",
    title: "Authorized Representative / Coordinator",
    sub: "[ Organization / Agency Name ]",
  },
  signatoryRight: {
    enabled: false,
    name: "",
    title: "",
    sub: "",
  },

  showEndorsement: true,
  endorsementLabel: "ENDORSED & RECOMMENDED BY:",
  endorseLeft: {
    enabled: true,
    name: "[ Name of PMO Director ]",
    title: "Director, Property Management Office (PMO)",
    sub: "Father Saturnino Urios University",
  },
  endorseRight: {
    enabled: false,
    name: "",
    title: "",
    sub: "",
  },

  showApproval: true,
  approvalLabel: "APPROVED BY:",
  approver: {
    enabled: true,
    name: "[ Name of VP for Administration ]",
    title: "Vice President for Administration",
    sub: "Father Saturnino Urios University",
  },

  showClearance: true,
  finalClearanceLabel: "FACILITY CLEARANCE & VENUE SCHEDULING:",
  finalClearance: {
    enabled: true,
    name: "[ Name of PMO Director / Custodian ]",
    title: "Property Management Office",
    sub: "Father Saturnino Urios University",
  },

  customSignatories: [],
};

// Clean toggle component
function ToggleSwitch({ enabled = true, onChange, label = "" }) {
  return (
    <div
      className="flex items-center gap-1.5 cursor-pointer select-none"
      onClick={() => onChange(!enabled)}
    >
      <span
        className={`text-[10.5px] font-bold uppercase tracking-wider transition-colors ${
          enabled ? "text-emerald-700" : "text-slate-400"
        }`}
      >
        {enabled ? "Visible" : "Hidden"}
      </span>
      <IosToggle
        checked={enabled}
        onChange={onChange}
        size="sm"
      />
    </div>
  );
}

function resolveTemplateConfig(req, type) {
  let loaded = null;
  if (req?.format_content) {
    if (typeof req.format_content === "object" && Object.keys(req.format_content).length > 0) {
      loaded = JSON.parse(JSON.stringify(req.format_content));
    } else if (typeof req.format_content === "string" && req.format_content.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(req.format_content);
        if (parsed && typeof parsed === "object") loaded = parsed;
      } catch {}
    }
  }

  const rawType = String(req?.classification || type || "").toLowerCase();
  let baseConfig = DEFAULT_ORG_CONFIG;

  if (rawType.includes("acad")) {
    baseConfig = DEFAULT_ACAD_CONFIG;
  } else if (rawType.includes("external")) {
    baseConfig = DEFAULT_EXTERNAL_CONFIG;
  } else {
    baseConfig = DEFAULT_ORG_CONFIG;
  }

  const merged = { ...JSON.parse(JSON.stringify(baseConfig)), ...(loaded || {}) };

  // Guarantee list arrays exist
  if (!Array.isArray(merged.customRouting)) merged.customRouting = [];
  if (!Array.isArray(merged.customBodySections)) merged.customBodySections = [];
  if (!Array.isArray(merged.customSignatories)) merged.customSignatories = [];

  // Guarantee individual signatories have enabled properties
  if (merged.signatoryLeft) merged.signatoryLeft.enabled = merged.signatoryLeft.enabled ?? true;
  if (merged.signatoryRight) merged.signatoryRight.enabled = merged.signatoryRight.enabled ?? (Boolean(merged.signatoryRight?.name));
  if (merged.endorseLeft) merged.endorseLeft.enabled = merged.endorseLeft.enabled ?? true;
  if (merged.endorseRight) merged.endorseRight.enabled = merged.endorseRight.enabled ?? (Boolean(merged.endorseRight?.name));
  if (merged.approver) merged.approver.enabled = merged.approver.enabled ?? true;
  if (merged.finalClearance) merged.finalClearance.enabled = merged.finalClearance.enabled ?? (Boolean(merged.finalClearance?.name));

  if (!loaded && req?.label) {
    merged.subject = `Formal Request: ${req.label}`;
  }

  return merged;
}

export default function EndorsementLetterTemplateModal({
  isOpen,
  onClose,
  initialType = "organization",
  allowEdit = false,
  showTypeTabs = false,
  departmentName = "",
  requirement = null,
  onSaveTemplate = null,
}) {
  const [activeType, setActiveType] = useState(initialType || "organization");
  const [isEditing, setIsEditing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTab, setEditTab] = useState("routing");

  const [currentConfig, setCurrentConfig] = useState(() => resolveTemplateConfig(requirement, initialType));
  const [editConfig, setEditConfig] = useState(() => resolveTemplateConfig(requirement, initialType));

  useEffect(() => {
    if (isOpen) {
      const resolved = resolveTemplateConfig(requirement, initialType || activeType);
      setCurrentConfig(resolved);
      setEditConfig(JSON.parse(JSON.stringify(resolved)));
      setIsEditing(false);
    }
  }, [isOpen, requirement, initialType]);

  useEffect(() => {
    if (initialType) {
      const raw = initialType.toLowerCase();
      setActiveType(raw.includes("acad") ? "academic" : raw.includes("external") ? "external" : "organization");
    }
  }, [initialType, isOpen]);

  if (!isOpen) return null;

  const isOrg = activeType === "organization";

  const handleStartEdit = () => {
    setEditConfig(JSON.parse(JSON.stringify(currentConfig)));
    setIsEditing(true);
    setEditTab("routing");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditConfig(JSON.parse(JSON.stringify(currentConfig)));
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      if (onSaveTemplate) {
        await onSaveTemplate(editConfig);
      }
      setCurrentConfig(editConfig);
      setIsEditing(false);
      notify.success("Template Saved", "Letter template saved successfully.");
    } catch (err) {
      notify.error("Save Failed", "Failed to save template changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    if (!confirm("Reset this template back to official default format?")) return;
    const def = resolveTemplateConfig({ classification: activeType }, activeType);
    setEditConfig(def);
    notify.success("Template Reset", "Template restored to official default format. Click 'Save Changes' to apply.");
  };

  // Helper functions for adding dynamic items
  const handleAddRoutingField = () => {
    const newItem = {
      id: "route_" + Date.now(),
      label: "CC:",
      value: "",
      enabled: true,
    };
    setEditConfig({
      ...editConfig,
      customRouting: [...(editConfig.customRouting || []), newItem],
    });
  };

  const handleRemoveRoutingField = (id) => {
    setEditConfig({
      ...editConfig,
      customRouting: (editConfig.customRouting || []).filter((item) => item.id !== id),
    });
  };

  const handleAddBodySection = () => {
    const newSection = {
      id: "body_" + Date.now(),
      title: "Special Note / Details",
      content: "• Enter additional requirements or terms here...",
      enabled: true,
    };
    setEditConfig({
      ...editConfig,
      customBodySections: [...(editConfig.customBodySections || []), newSection],
    });
  };

  const handleRemoveBodySection = (id) => {
    setEditConfig({
      ...editConfig,
      customBodySections: (editConfig.customBodySections || []).filter((sec) => sec.id !== id),
    });
  };

  const handleAddCustomSignatory = () => {
    const newSig = {
      id: "sig_" + Date.now(),
      group: "NOTED & ATTESTED BY:",
      name: "[ Full Name ]",
      title: "[ Position / Title ]",
      sub: "Father Saturnino Urios University",
      enabled: true,
    };
    setEditConfig({
      ...editConfig,
      customSignatories: [...(editConfig.customSignatories || []), newSig],
    });
  };

  const handleRemoveCustomSignatory = (id) => {
    setEditConfig({
      ...editConfig,
      customSignatories: (editConfig.customSignatories || []).filter((sig) => sig.id !== id),
    });
  };

  const handleDownloadDoc = () => {
    setDownloading(true);
    const cfg = isEditing ? editConfig : currentConfig;
    const cleanTitle = (requirement?.label || (activeType === "academic" ? "Academic_Endorsement" : activeType === "external" ? "External_Facility_Request" : "Student_Organization_Endorsement"))
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_');
    const filename = `FSUU_${cleanTitle}.doc`;

    const officeSubTitle = isOrg
      ? "Office of Institutional Student Affairs & Activities (OISAA)"
      : "Office of the Vice President for Academic and Student Affairs (OVPASA)";

    // Generates compact, single-page Word HTML respecting enabled/disabled state & dynamic items
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
          ${cfg.showDate !== false && cfg.dateLabel ? `<p style="margin: 0 0 6pt 0; font-family:'Times New Roman',serif; font-size:10.5pt; font-weight: bold;">${cfg.dateLabel}</p>` : ''}
          <table class="memo-table" width="100%" cellpadding="0" cellspacing="0">
            ${cfg.showFor !== false && cfg.forTitle ? `
            <tr>
              <td class="memo-label" width="90">FOR:</td>
              <td>${cfg.forTitle.replace(/\n/g, "<br>")}</td>
            </tr>` : ''}

            ${cfg.showThrough !== false && cfg.throughTitle ? `
            <tr>
              <td class="memo-label" width="90">THROUGH:</td>
              <td>${cfg.throughTitle.replace(/\n/g, "<br>")}</td>
            </tr>` : ''}

            ${cfg.showFrom !== false && cfg.fromTitle ? `
            <tr>
              <td class="memo-label" width="90">FROM:</td>
              <td>${cfg.fromTitle}</td>
            </tr>` : ''}

            ${cfg.showSubject !== false && cfg.subject ? `
            <tr>
              <td class="memo-label" width="90">SUBJECT:</td>
              <td style="font-weight: bold;">${cfg.subject}</td>
            </tr>` : ''}

            ${(cfg.customRouting || [])
              .filter(item => item.enabled !== false && item.value)
              .map(item => `
                <tr>
                  <td class="memo-label" width="90">${item.label || "INFO:"}</td>
                  <td>${item.value.replace(/\n/g, "<br>")}</td>
                </tr>
              `).join('')}
          </table>

          <!-- Body Content -->
          ${cfg.showSalutation !== false && cfg.salutation ? `<p class="body-p" style="margin-top: 8pt;">${cfg.salutation}</p>` : ''}
          ${cfg.showOpening !== false && cfg.opening ? `<p class="body-p">${cfg.opening.replace(/\n\n/g, "</p><p class='body-p'>").replace(/\n/g, "<br>")}</p>` : ''}
          
          ${cfg.showActivityDetails !== false && cfg.activityDetails ? `
          <div>
            ${cfg.activityDetails.split('\n').map(line => `<p class="bullet-p">${line}</p>`).join('')}
          </div>` : ''}

          ${(cfg.customBodySections || [])
            .filter(sec => sec.enabled !== false && sec.content)
            .map(sec => `
              ${sec.title ? `<p style="font-weight:bold; margin: 6pt 0 2pt 0; font-family:'Times New Roman',serif; font-size:10.5pt;">${sec.title}</p>` : ''}
              <div style="margin-bottom: 5pt;">
                ${sec.content.split('\n').map(line => `<p class="body-p">${line}</p>`).join('')}
              </div>
            `).join('')}

          ${cfg.showComplianceNote !== false && cfg.complianceNote ? `<p class="body-p" style="margin-top: 5pt;">${cfg.complianceNote.replace(/\n/g, "<br>")}</p>` : ''}
          ${cfg.showClosing !== false && cfg.closing ? `<p class="body-p" style="margin-top: 8pt;">${cfg.closing}</p>` : ''}

          <!-- Lead Signatories -->
          ${cfg.showApplicantSignatories !== false && ((cfg.signatoryLeft?.enabled !== false && cfg.signatoryLeft?.name) || (cfg.signatoryRight?.enabled !== false && cfg.signatoryRight?.name)) ? `
          <table class="signatory-table" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${cfg.signatoryLeft?.enabled !== false && cfg.signatoryLeft?.name ? `
              <td width="48%" align="left" valign="top">
                <div class="sign-line"></div>
                <p class="sign-name">${cfg.signatoryLeft.name}</p>
                <p class="sign-title">${cfg.signatoryLeft.title}</p>
                <p class="sign-sub">${cfg.signatoryLeft.sub}</p>
              </td>` : '<td width="48%"></td>'}
              ${cfg.signatoryRight?.enabled !== false && cfg.signatoryRight?.name ? `
              <td width="48%" align="left" valign="top">
                <div class="sign-line"></div>
                <p class="sign-name">${cfg.signatoryRight.name}</p>
                <p class="sign-title">${cfg.signatoryRight.title}</p>
                <p class="sign-sub">${cfg.signatoryRight.sub}</p>
              </td>` : '<td width="48%"></td>'}
            </tr>
          </table>` : ''}

          <!-- Endorsement Section -->
          ${cfg.showEndorsement !== false && cfg.endorsementLabel && ((cfg.endorseLeft?.enabled !== false && cfg.endorseLeft?.name) || (cfg.endorseRight?.enabled !== false && cfg.endorseRight?.name)) ? `
          <p class="section-heading">${cfg.endorsementLabel}</p>
          <table class="signatory-table" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 4pt;">
            <tr>
              ${cfg.endorseLeft?.enabled !== false && cfg.endorseLeft?.name ? `
              <td width="48%" align="left" valign="top">
                <div class="sign-line"></div>
                <p class="sign-name">${cfg.endorseLeft.name}</p>
                <p class="sign-title">${cfg.endorseLeft.title}</p>
                <p class="sign-sub">${cfg.endorseLeft.sub}</p>
              </td>` : '<td width="48%"></td>'}
              ${cfg.endorseRight?.enabled !== false && cfg.endorseRight?.name ? `
              <td width="48%" align="left" valign="top">
                <div class="sign-line"></div>
                <p class="sign-name">${cfg.endorseRight.name}</p>
                <p class="sign-title">${cfg.endorseRight.title}</p>
                <p class="sign-sub">${cfg.endorseRight.sub}</p>
              </td>` : '<td width="48%"></td>'}
            </tr>
          </table>` : ''}

          <!-- Approval Section -->
          ${cfg.showApproval !== false && cfg.approvalLabel && cfg.approver && cfg.approver.enabled !== false && cfg.approver.name ? `
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

          <!-- Clearance Section -->
          ${cfg.showClearance !== false && cfg.finalClearanceLabel && cfg.finalClearance && cfg.finalClearance.enabled !== false && cfg.finalClearance.name ? `
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

          <!-- Custom Additional Signatories -->
          ${(cfg.customSignatories || [])
            .filter(sig => sig.enabled !== false && sig.name)
            .map(sig => `
              ${sig.group ? `<p class="section-heading">${sig.group}</p>` : ''}
              <table class="signatory-table" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 4pt;">
                <tr>
                  <td width="48%" align="left" valign="top">
                    <div class="sign-line"></div>
                    <p class="sign-name">${sig.name}</p>
                    <p class="sign-title">${sig.title}</p>
                    <p class="sign-sub">${sig.sub}</p>
                  </td>
                  <td width="48%"></td>
                </tr>
              </table>
            `).join('')}

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
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {requirement?.label ? (requirement.label.replace(/^Format:\s*/i, "")) : "Endorsement Letter Format"}
              </h3>
              {requirement?.classification && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  {requirement.classification}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          
          <div className="flex items-center gap-2">
            {!requirement && showTypeTabs && (
              <div className="flex gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveType("organization");
                    const cfg = resolveTemplateConfig(null, "organization");
                    setCurrentConfig(cfg);
                    if (isEditing) setEditConfig(cfg);
                  }}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    activeType === "organization"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Student Organization
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveType("academic");
                    const cfg = resolveTemplateConfig(null, "academic");
                    setCurrentConfig(cfg);
                    if (isEditing) setEditConfig(cfg);
                  }}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    activeType === "academic"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Academic
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveType("external");
                    const cfg = resolveTemplateConfig(null, "external");
                    setCurrentConfig(cfg);
                    if (isEditing) setEditConfig(cfg);
                  }}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    activeType === "external"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  External
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
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Edit3 size={13} />
                <span>Edit Template</span>
              </button>
            )}

            {isEditing ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleResetDefault}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                  title="Reset to Default"
                >
                  Reset Default
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveChanges}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
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
          /* ── Structured Sectional Editor with Enable/Disable & Plus Buttons ── */
          <div className="flex-1 min-h-[400px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
            
            {/* Section Tabs */}
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

            {/* TAB 1: Routing & Memo */}
            {editTab === "routing" && (
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Header &amp; Routing Fields
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Toggle visibility or click (+) to add new routing lines
                  </span>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">Date Line</label>
                    <ToggleSwitch
                      enabled={editConfig.showDate !== false}
                      onChange={(val) => setEditConfig({ ...editConfig, showDate: val })}
                    />
                  </div>
                  <input
                    type="text"
                    disabled={editConfig.showDate === false}
                    value={editConfig.dateLabel}
                    onChange={(e) => setEditConfig({ ...editConfig, dateLabel: e.target.value })}
                    className={`w-full p-2 border rounded text-slate-900 ${
                      editConfig.showDate === false ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "border-slate-300"
                    }`}
                  />
                </div>

                {/* FOR: Recipient */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">FOR: Recipient</label>
                    <ToggleSwitch
                      enabled={editConfig.showFor !== false}
                      onChange={(val) => setEditConfig({ ...editConfig, showFor: val })}
                    />
                  </div>
                  <textarea
                    rows={2}
                    disabled={editConfig.showFor === false}
                    value={editConfig.forTitle}
                    onChange={(e) => setEditConfig({ ...editConfig, forTitle: e.target.value })}
                    className={`w-full p-2 border rounded text-slate-900 font-mono text-xs ${
                      editConfig.showFor === false ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "border-slate-300"
                    }`}
                  />
                </div>

                {/* THROUGH: Endorsement */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">THROUGH: Endorsement Route</label>
                    <ToggleSwitch
                      enabled={editConfig.showThrough !== false}
                      onChange={(val) => setEditConfig({ ...editConfig, showThrough: val })}
                    />
                  </div>
                  <textarea
                    rows={2}
                    disabled={editConfig.showThrough === false}
                    value={editConfig.throughTitle}
                    onChange={(e) => setEditConfig({ ...editConfig, throughTitle: e.target.value })}
                    className={`w-full p-2 border rounded text-slate-900 font-mono text-xs ${
                      editConfig.showThrough === false ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "border-slate-300"
                    }`}
                  />
                </div>

                {/* FROM & SUBJECT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700">FROM: Applicant</label>
                      <ToggleSwitch
                        enabled={editConfig.showFrom !== false}
                        onChange={(val) => setEditConfig({ ...editConfig, showFrom: val })}
                      />
                    </div>
                    <input
                      type="text"
                      disabled={editConfig.showFrom === false}
                      value={editConfig.fromTitle}
                      onChange={(e) => setEditConfig({ ...editConfig, fromTitle: e.target.value })}
                      className={`w-full p-2 border rounded text-slate-900 ${
                        editConfig.showFrom === false ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "border-slate-300"
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700">SUBJECT</label>
                      <ToggleSwitch
                        enabled={editConfig.showSubject !== false}
                        onChange={(val) => setEditConfig({ ...editConfig, showSubject: val })}
                      />
                    </div>
                    <input
                      type="text"
                      disabled={editConfig.showSubject === false}
                      value={editConfig.subject}
                      onChange={(e) => setEditConfig({ ...editConfig, subject: e.target.value })}
                      className={`w-full p-2 border rounded text-slate-900 font-bold ${
                        editConfig.showSubject === false ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "border-slate-300"
                      }`}
                    />
                  </div>
                </div>

                {/* Additional Dynamic Routing Lines */}
                {(editConfig.customRouting || []).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider block">
                      Custom Routing Lines
                    </span>
                    {(editConfig.customRouting || []).map((item, idx) => (
                      <div key={item.id || idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                        <input
                          type="text"
                          placeholder="Label (e.g. CC:)"
                          value={item.label}
                          onChange={(e) => {
                            const copy = [...editConfig.customRouting];
                            copy[idx].label = e.target.value;
                            setEditConfig({ ...editConfig, customRouting: copy });
                          }}
                          className="w-24 p-1.5 border border-slate-300 rounded font-bold uppercase text-[11px]"
                        />
                        <input
                          type="text"
                          placeholder="Recipient or Route description..."
                          value={item.value}
                          onChange={(e) => {
                            const copy = [...editConfig.customRouting];
                            copy[idx].value = e.target.value;
                            setEditConfig({ ...editConfig, customRouting: copy });
                          }}
                          className="flex-1 p-1.5 border border-slate-300 rounded text-slate-900"
                        />
                        <ToggleSwitch
                          enabled={item.enabled !== false}
                          onChange={(val) => {
                            const copy = [...editConfig.customRouting];
                            copy[idx].enabled = val;
                            setEditConfig({ ...editConfig, customRouting: copy });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveRoutingField(item.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer transition-colors"
                          title="Remove Field"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Routing Button (+) */}
                <button
                  type="button"
                  onClick={handleAddRoutingField}
                  className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-lg text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Routing Field</span>
                </button>
              </div>
            )}

            {/* TAB 2: Letter Body */}
            {editTab === "body" && (
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Body Paragraphs &amp; Terms
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Toggle visibility or click (+) to add new paragraphs
                  </span>
                </div>

                {/* Salutation */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">Salutation</label>
                    <ToggleSwitch
                      enabled={editConfig.showSalutation !== false}
                      onChange={(val) => setEditConfig({ ...editConfig, showSalutation: val })}
                    />
                  </div>
                  <input
                    type="text"
                    disabled={editConfig.showSalutation === false}
                    value={editConfig.salutation}
                    onChange={(e) => setEditConfig({ ...editConfig, salutation: e.target.value })}
                    className={`w-full p-2 border rounded text-slate-900 ${
                      editConfig.showSalutation === false ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "border-slate-300"
                    }`}
                  />
                </div>

                {/* Opening Request Paragraph */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">Opening Request Paragraph</label>
                    <ToggleSwitch
                      enabled={editConfig.showOpening !== false}
                      onChange={(val) => setEditConfig({ ...editConfig, showOpening: val })}
                    />
                  </div>
                  <textarea
                    rows={4}
                    disabled={editConfig.showOpening === false}
                    value={editConfig.opening}
                    onChange={(e) => setEditConfig({ ...editConfig, opening: e.target.value })}
                    className={`w-full p-2 border rounded text-slate-900 font-mono text-xs leading-relaxed ${
                      editConfig.showOpening === false ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "border-slate-300"
                    }`}
                  />
                </div>

                {/* Activity Specification Bullets */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">Activity Specification Bullets</label>
                    <ToggleSwitch
                      enabled={editConfig.showActivityDetails !== false}
                      onChange={(val) => setEditConfig({ ...editConfig, showActivityDetails: val })}
                    />
                  </div>
                  <textarea
                    rows={3}
                    disabled={editConfig.showActivityDetails === false}
                    value={editConfig.activityDetails}
                    onChange={(e) => setEditConfig({ ...editConfig, activityDetails: e.target.value })}
                    className={`w-full p-2 border rounded text-slate-900 font-mono text-xs leading-relaxed ${
                      editConfig.showActivityDetails === false ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "border-slate-300"
                    }`}
                  />
                </div>

                {/* Additional Dynamic Body Sections */}
                {(editConfig.customBodySections || []).length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider block">
                      Custom Paragraphs &amp; Terms
                    </span>
                    {(editConfig.customBodySections || []).map((sec, idx) => (
                      <div key={sec.id || idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            placeholder="Section Title (Optional)"
                            value={sec.title}
                            onChange={(e) => {
                              const copy = [...editConfig.customBodySections];
                              copy[idx].title = e.target.value;
                              setEditConfig({ ...editConfig, customBodySections: copy });
                            }}
                            className="font-bold text-xs p-1.5 border border-slate-300 rounded flex-1 bg-white"
                          />
                          <ToggleSwitch
                            enabled={sec.enabled !== false}
                            onChange={(val) => {
                              const copy = [...editConfig.customBodySections];
                              copy[idx].enabled = val;
                              setEditConfig({ ...editConfig, customBodySections: copy });
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBodySection(sec.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer transition-colors"
                            title="Remove Section"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          placeholder="Paragraph content..."
                          value={sec.content}
                          onChange={(e) => {
                            const copy = [...editConfig.customBodySections];
                            copy[idx].content = e.target.value;
                            setEditConfig({ ...editConfig, customBodySections: copy });
                          }}
                          className="w-full p-2 border border-slate-300 rounded font-mono text-xs bg-white"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Section Button (+) */}
                <button
                  type="button"
                  onClick={handleAddBodySection}
                  className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-lg text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Paragraph / Section</span>
                </button>

                {/* Policy & Care Statement */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">Policy &amp; Care Statement</label>
                    <ToggleSwitch
                      enabled={editConfig.showComplianceNote !== false}
                      onChange={(val) => setEditConfig({ ...editConfig, showComplianceNote: val })}
                    />
                  </div>
                  <textarea
                    rows={2}
                    disabled={editConfig.showComplianceNote === false}
                    value={editConfig.complianceNote}
                    onChange={(e) => setEditConfig({ ...editConfig, complianceNote: e.target.value })}
                    className={`w-full p-2 border rounded text-slate-900 font-mono text-xs leading-relaxed ${
                      editConfig.showComplianceNote === false ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "border-slate-300"
                    }`}
                  />
                </div>

                {/* Complimentary Close */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">Complimentary Close</label>
                    <ToggleSwitch
                      enabled={editConfig.showClosing !== false}
                      onChange={(val) => setEditConfig({ ...editConfig, showClosing: val })}
                    />
                  </div>
                  <input
                    type="text"
                    disabled={editConfig.showClosing === false}
                    value={editConfig.closing}
                    onChange={(e) => setEditConfig({ ...editConfig, closing: e.target.value })}
                    className={`w-full p-2 border rounded text-slate-900 ${
                      editConfig.showClosing === false ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "border-slate-300"
                    }`}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: Signatories */}
            {editTab === "signatories" && (
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-5 text-xs">
                
                {/* 1. Lead Signatories */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Applicant Signatories
                    </span>
                    <ToggleSwitch
                      enabled={editConfig.showApplicantSignatories !== false}
                      onChange={(val) => setEditConfig({ ...editConfig, showApplicantSignatories: val })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-700">Left: Primary Applicant</p>
                        <ToggleSwitch
                          enabled={editConfig.signatoryLeft?.enabled !== false}
                          onChange={(val) =>
                            setEditConfig({
                              ...editConfig,
                              signatoryLeft: { ...editConfig.signatoryLeft, enabled: val },
                            })
                          }
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Name"
                        value={editConfig.signatoryLeft?.name || ""}
                        onChange={(e) => setEditConfig({ ...editConfig, signatoryLeft: { ...editConfig.signatoryLeft, name: e.target.value } })}
                        className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Title / Position"
                        value={editConfig.signatoryLeft?.title || ""}
                        onChange={(e) => setEditConfig({ ...editConfig, signatoryLeft: { ...editConfig.signatoryLeft, title: e.target.value } })}
                        className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Organization / Department"
                        value={editConfig.signatoryLeft?.sub || ""}
                        onChange={(e) => setEditConfig({ ...editConfig, signatoryLeft: { ...editConfig.signatoryLeft, sub: e.target.value } })}
                        className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-700">Right: Faculty Moderator / Adviser</p>
                        <ToggleSwitch
                          enabled={editConfig.signatoryRight?.enabled !== false}
                          onChange={(val) =>
                            setEditConfig({
                              ...editConfig,
                              signatoryRight: { ...editConfig.signatoryRight, enabled: val },
                            })
                          }
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Name"
                        value={editConfig.signatoryRight?.name || ""}
                        onChange={(e) => setEditConfig({ ...editConfig, signatoryRight: { ...editConfig.signatoryRight, name: e.target.value } })}
                        className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Title"
                        value={editConfig.signatoryRight?.title || ""}
                        onChange={(e) => setEditConfig({ ...editConfig, signatoryRight: { ...editConfig.signatoryRight, title: e.target.value } })}
                        className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Department"
                        value={editConfig.signatoryRight?.sub || ""}
                        onChange={(e) => setEditConfig({ ...editConfig, signatoryRight: { ...editConfig.signatoryRight, sub: e.target.value } })}
                        className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Endorsement Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Endorsement Authorities
                    </span>
                    <ToggleSwitch
                      enabled={editConfig.showEndorsement !== false}
                      onChange={(val) => setEditConfig({ ...editConfig, showEndorsement: val })}
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Endorsement Section Heading"
                    value={editConfig.endorsementLabel || ""}
                    onChange={(e) => setEditConfig({ ...editConfig, endorsementLabel: e.target.value })}
                    className="w-full p-1.5 border border-slate-300 rounded text-slate-900 font-bold uppercase text-[11px] bg-slate-50"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-700">Left: Dean / Head</p>
                        <ToggleSwitch
                          enabled={editConfig.endorseLeft?.enabled !== false}
                          onChange={(val) =>
                            setEditConfig({
                              ...editConfig,
                              endorseLeft: { ...editConfig.endorseLeft, enabled: val },
                            })
                          }
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Name"
                        value={editConfig.endorseLeft?.name || ""}
                        onChange={(e) => setEditConfig({ ...editConfig, endorseLeft: { ...editConfig.endorseLeft, name: e.target.value } })}
                        className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Title"
                        value={editConfig.endorseLeft?.title || ""}
                        onChange={(e) => setEditConfig({ ...editConfig, endorseLeft: { ...editConfig.endorseLeft, title: e.target.value } })}
                        className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-700">Right: Director</p>
                        <ToggleSwitch
                          enabled={editConfig.endorseRight?.enabled !== false}
                          onChange={(val) =>
                            setEditConfig({
                              ...editConfig,
                              endorseRight: { ...editConfig.endorseRight, enabled: val },
                            })
                          }
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Name"
                        value={editConfig.endorseRight?.name || ""}
                        onChange={(e) => setEditConfig({ ...editConfig, endorseRight: { ...editConfig.endorseRight, name: e.target.value } })}
                        className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Title"
                        value={editConfig.endorseRight?.title || ""}
                        onChange={(e) => setEditConfig({ ...editConfig, endorseRight: { ...editConfig.endorseRight, title: e.target.value } })}
                        className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Final Approval Authority */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Final Approval Authority
                    </span>
                    <ToggleSwitch
                      enabled={editConfig.showApproval !== false}
                      onChange={(val) => setEditConfig({ ...editConfig, showApproval: val })}
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Approval Section Heading"
                    value={editConfig.approvalLabel || ""}
                    onChange={(e) => setEditConfig({ ...editConfig, approvalLabel: e.target.value })}
                    className="w-full p-1.5 border border-slate-300 rounded text-slate-900 font-bold uppercase text-[11px] bg-slate-50"
                  />

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 max-w-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-700">Approver Details</p>
                      <ToggleSwitch
                        enabled={editConfig.approver?.enabled !== false}
                        onChange={(val) =>
                          setEditConfig({
                            ...editConfig,
                            approver: { ...editConfig.approver, enabled: val },
                          })
                        }
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Approver Name"
                      value={editConfig.approver?.name || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, approver: { ...editConfig.approver, name: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Approver Title"
                      value={editConfig.approver?.title || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, approver: { ...editConfig.approver, title: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                    />
                  </div>
                </div>

                {/* 4. Final Facility Clearance */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Facility Clearance / PMO
                    </span>
                    <ToggleSwitch
                      enabled={editConfig.showClearance !== false}
                      onChange={(val) => setEditConfig({ ...editConfig, showClearance: val })}
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Clearance Section Heading"
                    value={editConfig.finalClearanceLabel || ""}
                    onChange={(e) => setEditConfig({ ...editConfig, finalClearanceLabel: e.target.value })}
                    className="w-full p-1.5 border border-slate-300 rounded text-slate-900 font-bold uppercase text-[11px] bg-slate-50"
                  />

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 max-w-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-700">Clearance Officer</p>
                      <ToggleSwitch
                        enabled={editConfig.finalClearance?.enabled !== false}
                        onChange={(val) =>
                          setEditConfig({
                            ...editConfig,
                            finalClearance: { ...editConfig.finalClearance, enabled: val },
                          })
                        }
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Officer Name"
                      value={editConfig.finalClearance?.name || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, finalClearance: { ...editConfig.finalClearance, name: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Officer Title"
                      value={editConfig.finalClearance?.title || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, finalClearance: { ...editConfig.finalClearance, title: e.target.value } })}
                      className="w-full p-1.5 border border-slate-300 rounded text-slate-900 bg-white"
                    />
                  </div>
                </div>

                {/* 5. Custom Dynamic Signatories */}
                {(editConfig.customSignatories || []).length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <span className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider block">
                      Additional Signatories
                    </span>
                    {(editConfig.customSignatories || []).map((sig, idx) => (
                      <div key={sig.id || idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            placeholder="Heading e.g. NOTED BY:"
                            value={sig.group}
                            onChange={(e) => {
                              const copy = [...editConfig.customSignatories];
                              copy[idx].group = e.target.value;
                              setEditConfig({ ...editConfig, customSignatories: copy });
                            }}
                            className="font-bold text-xs p-1.5 border border-slate-300 rounded flex-1 bg-white uppercase"
                          />
                          <ToggleSwitch
                            enabled={sig.enabled !== false}
                            onChange={(val) => {
                              const copy = [...editConfig.customSignatories];
                              copy[idx].enabled = val;
                              setEditConfig({ ...editConfig, customSignatories: copy });
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomSignatory(sig.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer transition-colors"
                            title="Remove Signatory"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Signatory Name"
                            value={sig.name}
                            onChange={(e) => {
                              const copy = [...editConfig.customSignatories];
                              copy[idx].name = e.target.value;
                              setEditConfig({ ...editConfig, customSignatories: copy });
                            }}
                            className="p-1.5 border border-slate-300 rounded bg-white text-slate-900"
                          />
                          <input
                            type="text"
                            placeholder="Title / Position"
                            value={sig.title}
                            onChange={(e) => {
                              const copy = [...editConfig.customSignatories];
                              copy[idx].title = e.target.value;
                              setEditConfig({ ...editConfig, customSignatories: copy });
                            }}
                            className="p-1.5 border border-slate-300 rounded bg-white text-slate-900"
                          />
                          <input
                            type="text"
                            placeholder="Department / Affiliation"
                            value={sig.sub}
                            onChange={(e) => {
                              const copy = [...editConfig.customSignatories];
                              copy[idx].sub = e.target.value;
                              setEditConfig({ ...editConfig, customSignatories: copy });
                            }}
                            className="p-1.5 border border-slate-300 rounded bg-white text-slate-900"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Signatory Button (+) */}
                <button
                  type="button"
                  onClick={handleAddCustomSignatory}
                  className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-lg text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Signatory</span>
                </button>

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
                {previewConfig.showDate !== false && previewConfig.dateLabel && (
                  <p className="font-bold mb-1.5">{previewConfig.dateLabel}</p>
                )}
                <div className="space-y-0.5">
                  {previewConfig.showFor !== false && previewConfig.forTitle && (
                    <div className="grid grid-cols-[75px_1fr] gap-1">
                      <span className="font-bold text-slate-600">FOR:</span>
                      <span className="whitespace-pre-line">{previewConfig.forTitle}</span>
                    </div>
                  )}
                  {previewConfig.showThrough !== false && previewConfig.throughTitle && (
                    <div className="grid grid-cols-[75px_1fr] gap-1 pt-0.5">
                      <span className="font-bold text-slate-600">THROUGH:</span>
                      <span className="whitespace-pre-line">{previewConfig.throughTitle}</span>
                    </div>
                  )}
                  {previewConfig.showFrom !== false && previewConfig.fromTitle && (
                    <div className="grid grid-cols-[75px_1fr] gap-1 pt-0.5">
                      <span className="font-bold text-slate-600">FROM:</span>
                      <span>{previewConfig.fromTitle}</span>
                    </div>
                  )}
                  {previewConfig.showSubject !== false && previewConfig.subject && (
                    <div className="grid grid-cols-[75px_1fr] gap-1 pt-0.5">
                      <span className="font-bold text-slate-600">SUBJECT:</span>
                      <span className="font-bold">{previewConfig.subject}</span>
                    </div>
                  )}
                  {(previewConfig.customRouting || [])
                    .filter(item => item.enabled !== false && item.value)
                    .map((item, i) => (
                      <div key={i} className="grid grid-cols-[75px_1fr] gap-1 pt-0.5">
                        <span className="font-bold text-slate-600">{item.label || "INFO:"}</span>
                        <span className="whitespace-pre-line">{item.value}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Body Text */}
              <div className="font-mono text-[11.5px] text-slate-800 space-y-2 leading-relaxed">
                {previewConfig.showSalutation !== false && previewConfig.salutation && (
                  <p>{previewConfig.salutation}</p>
                )}
                {previewConfig.showOpening !== false && previewConfig.opening && (
                  <p className="whitespace-pre-line">{previewConfig.opening}</p>
                )}
                {previewConfig.showActivityDetails !== false && previewConfig.activityDetails && (
                  <div className="pl-3 py-0.5 border-l-2 border-slate-200 whitespace-pre-line text-slate-700 text-[11px]">
                    {previewConfig.activityDetails}
                  </div>
                )}
                {(previewConfig.customBodySections || [])
                  .filter(sec => sec.enabled !== false && sec.content)
                  .map((sec, i) => (
                    <div key={i} className="space-y-1">
                      {sec.title && <p className="font-bold text-slate-900">{sec.title}</p>}
                      <p className="whitespace-pre-line">{sec.content}</p>
                    </div>
                  ))}
                {previewConfig.showComplianceNote !== false && previewConfig.complianceNote && (
                  <p className="whitespace-pre-line">{previewConfig.complianceNote}</p>
                )}
                {previewConfig.showClosing !== false && previewConfig.closing && (
                  <p className="pt-0.5">{previewConfig.closing}</p>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-2 font-mono text-[11px]">
                
                {/* Applicant Signatories */}
                {previewConfig.showApplicantSignatories !== false && ((previewConfig.signatoryLeft?.enabled !== false && previewConfig.signatoryLeft?.name) || (previewConfig.signatoryRight?.enabled !== false && previewConfig.signatoryRight?.name)) && (
                  <div className="grid grid-cols-2 gap-6">
                    {previewConfig.signatoryLeft?.enabled !== false && previewConfig.signatoryLeft?.name ? (
                      <div>
                        <div className="border-b border-slate-900 w-full mb-1 h-5"></div>
                        <p className="font-bold text-slate-900">{previewConfig.signatoryLeft.name}</p>
                        <p className="text-[10px] text-slate-600">{previewConfig.signatoryLeft.title}</p>
                        <p className="text-[9.5px] text-slate-400">{previewConfig.signatoryLeft.sub}</p>
                      </div>
                    ) : <div></div>}
                    {previewConfig.signatoryRight?.enabled !== false && previewConfig.signatoryRight?.name && (
                      <div>
                        <div className="border-b border-slate-900 w-full mb-1 h-5"></div>
                        <p className="font-bold text-slate-900">{previewConfig.signatoryRight.name}</p>
                        <p className="text-[10px] text-slate-600">{previewConfig.signatoryRight.title}</p>
                        <p className="text-[9.5px] text-slate-400">{previewConfig.signatoryRight.sub}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Endorsement */}
                {previewConfig.showEndorsement !== false && previewConfig.endorsementLabel && ((previewConfig.endorseLeft?.enabled !== false && previewConfig.endorseLeft?.name) || (previewConfig.endorseRight?.enabled !== false && previewConfig.endorseRight?.name)) && (
                  <div className="mt-3.5">
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {previewConfig.endorsementLabel}
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                      {previewConfig.endorseLeft?.enabled !== false && previewConfig.endorseLeft?.name ? (
                        <div>
                          <div className="border-b border-slate-900 w-full mb-1 h-5"></div>
                          <p className="font-bold text-slate-900">{previewConfig.endorseLeft?.name}</p>
                          <p className="text-[10px] text-slate-600">{previewConfig.endorseLeft?.title}</p>
                          <p className="text-[9.5px] text-slate-400">{previewConfig.endorseLeft?.sub}</p>
                        </div>
                      ) : <div></div>}
                      {previewConfig.endorseRight?.enabled !== false && previewConfig.endorseRight?.name && (
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
                {previewConfig.showApproval !== false && previewConfig.approvalLabel && previewConfig.approver && previewConfig.approver.enabled !== false && previewConfig.approver.name && (
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

                {/* Clearance */}
                {previewConfig.showClearance !== false && previewConfig.finalClearanceLabel && previewConfig.finalClearance && previewConfig.finalClearance.enabled !== false && previewConfig.finalClearance.name && (
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

                {/* Custom Additional Signatories */}
                {(previewConfig.customSignatories || [])
                  .filter(sig => sig.enabled !== false && sig.name)
                  .map((sig, i) => (
                    <div key={i} className="mt-3.5">
                      {sig.group && (
                        <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          {sig.group}
                        </p>
                      )}
                      <div className="max-w-[240px]">
                        <div className="border-b border-slate-900 w-full mb-1 h-5"></div>
                        <p className="font-bold text-slate-900">{sig.name}</p>
                        <p className="text-[10px] text-slate-600">{sig.title}</p>
                        <p className="text-[9.5px] text-slate-400">{sig.sub}</p>
                      </div>
                    </div>
                  ))}

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
