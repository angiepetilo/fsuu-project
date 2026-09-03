// ─── Permission Definitions ─────────────────────────────────────────────────
// Each action key maps to a granular permission stored as "module.action" in the DB.
// The backend hasPermission() already supports this "area.action" dot notation.
export const PERMISSION_MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    desc: "View overview counters and real-time statistics",
    actions: [
      { key: "view", label: "View Dashboard" },
    ],
  },
  {
    key: "interface",
    label: "Kiosk Interface",
    desc: "Access venue and equipment kiosk display interface",
    actions: [
      { key: "view", label: "View Interface" },
    ],
  },
  {
    key: "venue_bookings",
    label: "Venue Booking",
    desc: "Control every stage of the venue reservation lifecycle",
    actions: [
      { key: "approve",         label: "Approve" },
      { key: "reject",          label: "Reject" },
      { key: "assign_checkout", label: "Assign Checkout" },
      { key: "set_ongoing",     label: "Set On-going" },
      { key: "post_inspection", label: "Post Inspection" },
      { key: "complete",        label: "Complete" },
    ],
  },
  {
    key: "equipment_borrowing",
    label: "Equipment Borrowing",
    desc: "Handle the full equipment borrow-and-return workflow",
    actions: [
      { key: "approve",         label: "Approve" },
      { key: "reject",          label: "Reject" },
      { key: "assign_checkout", label: "Assign Checkout" },
      { key: "process_return",  label: "Process Return / Post Inspection" },
      { key: "complete",        label: "Complete" },
    ],
  },
  {
    key: "manage_venues",
    label: "Manage Venues",
    desc: "View and configure campus venue settings and availability",
    actions: [
      { key: "view",    label: "View" },
      { key: "add",     label: "Add" },
      { key: "edit",    label: "Edit" },
      { key: "disable", label: "Disable" },
    ],
  },
  {
    key: "manage_equipments",
    label: "Manage Equipment",
    desc: "Access and maintain the equipment inventory registry",
    actions: [
      { key: "view",    label: "View" },
      { key: "add",     label: "Add" },
      { key: "edit",    label: "Edit" },
      { key: "disable", label: "Disable" },
    ],
  },
  {
    key: "reports",
    label: "Report",
    desc: "Generate utilization summaries, policy violations, and equipment availability reports",
    actions: [
      { key: "booking_borrowing", label: "Booking & Borrowing Report" },
      { key: "breaches",          label: "Policy Violations & Damages" },
      { key: "inventory",         label: "Equipment Stock & Availability" },
      { key: "equipment_out",     label: "Equipment Out" },
      { key: "export_pdf",        label: "Export PDF / Print" },
      { key: "send_email",        label: "Send Email Report" },
    ],
  },
  {
    key: "history_log",
    label: "History Log",
    desc: "View the system audit trail, undo records, and archive entries",
    actions: [
      { key: "view",    label: "View" },
      { key: "undo",    label: "Undo" },
      { key: "disable", label: "Disable" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    desc: "Access individual administrative configuration tabs",
    actions: [
      { key: "equipment",          label: "Equipment Category" },
      { key: "venues",             label: "Venue Creation" },
      { key: "fee_matrix",         label: "Fee Matrix" },
      { key: "departments",        label: "Departments" },
      { key: "operating_hours",    label: "Operating Hours" },
      { key: "academic_terms",     label: "Academic Terms" },
      { key: "pin",                label: "Verification PIN" },
      { key: "communication_logs", label: "Communications Log" },
      { key: "system_settings",    label: "System Settings" },
    ],
  },
];

// Build a flat list of every possible granular permission key (module.action)
export const ALL_ACTION_KEYS = PERMISSION_MODULES.flatMap(m =>
  m.actions.map(a => `${m.key}.${a.key}`)
);

// Expand old-style flat module keys (e.g. "venue_bookings") to all their action keys
// for backward-compat when loading permissions stored in the old format.
export function expandPermissions(rawPerms = []) {
  const expanded = new Set();
  for (const p of rawPerms) {
    const mod = PERMISSION_MODULES.find(m => m.key === p);
    if (mod) {
      mod.actions.forEach(a => expanded.add(`${mod.key}.${a.key}`));
    } else {
      expanded.add(p);
    }
  }
  return Array.from(expanded);
}

export const PROTECTED_ROLE_NAMES = ["staff", "student_assistant"];
