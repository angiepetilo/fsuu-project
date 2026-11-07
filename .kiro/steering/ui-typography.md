---
inclusion: fileMatch
fileMatchPattern: "frontend/src/**/*.{jsx,css}"
---

# UI typography rules (FSUU Booking System)

One font (Inter) for every module and every role (public, student assistant, staff, super admin).
The scale lives in `frontend/src/index.css` ("TYPE SCALE" block). Use these classes; don't invent new sizes.

| Component | Use | Result |
|---|---|---|
| Top bar page title | layout `h1` (already set) | 18px / 700 |
| Modal title | `className="modal-title ..."` on the modal's `h2`/`h3` | 16px / 700 |
| Card / settings tab title | `className="card-title ..."` | 15px / 700 |
| Section label inside a card/modal | `text-xs font-bold uppercase tracking-wider` | 13px / 700 |
| Body text, buttons, inputs | `text-xs` (13px) or `text-sm` (14px) | 400–600 |
| Form label | `<label className="block ...">` | 13px / 600 (automatic) |
| Table header | any `<th>` | 11.5px / 600, uppercase (automatic) |
| Table cell | any `<td>`; add `font-semibold` for the main column | 13px / 500, or 600 |
| Badge / chip | `StatusBadge` | 11px / 600 |
| Numbers, codes | `font-mono` or `tabular-nums` | tabular digits |
| Printed documents | add `doc-table` to the `<table>` to opt out | keeps its own sizes |

Rules:
- No text smaller than 10px. No other font families (the endorsement letter's Times New Roman is the only exception).
- Don't add `text-[Npx]` sizes on `th`, `td`, `label.block`, `.modal-title`, `.card-title`; the scale overrides them anyway.
- Warning (amber) indicators: soft fill (`bg-amber-50`), light border (`border-amber-200`), dark text (`text-amber-800`). White text only on `bg-amber-700` or darker.

## Icon rules (lucide-react)

One icon per action, everywhere:

| Meaning | Icon | Never use for it |
|---|---|---|
| Edit | `Pencil` | `Edit`, `Edit2`, `Edit3` |
| Delete data | `Trash2` | `Ban` |
| Disable / deny | `Ban` | `Trash2` |
| Remove a file, chip or photo from a form | `X` | |
| Warning (amber) | `AlertTriangle` | `AlertCircle` |
| Error (red) | `AlertCircle` | `AlertTriangle` |
| History Log | `History` | `FileBarChart2` (that is Report) |
| Messages / SMS & email log | `MessageSquareText` | `Building2` |
| Money (fees) | `PhilippinePeso` | `DollarSign` |
| Equipment (public landing) | `Projector` | `PackageOpen` |
