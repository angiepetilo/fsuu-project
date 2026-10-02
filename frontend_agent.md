# Frontend Design System Agent

Goal: Redesign, standardize, and visually elevate **[ComponentName]** (path: `frontend/src/...`) according to institutional design system standards while guaranteeing **zero functional regression**.

---

## 🛑 Strict Scope & Safety Boundaries

1. **Design & Styling Scope ONLY**:
   - Allowed to modify: Tailwind CSS v4 class names, color palettes, off-white canvas backgrounds, typography scale, component spacing, layout grid alignments, Lucide React SVG icons, card containers, and visual presentation.
2. **ZERO Functional Regression Rule**:
   - **NEVER** alter, rename, or remove state hooks (`useState`, `useEffect`, `useCallback`, `useMemo`), handler functions (`onClick`, `onChange`, `onSubmit`), API call methods (`api.get`, `api.post`, `api.put`, `api.delete`), navigation routes, or form binding logic.
   - **NEVER** delete or mutate data properties passed via props or API responses.

---

## 🎨 1. Off-White Canvas & Container Architecture

- **Off-White Canvas Base (`#F8FAFC`)**:
  - Global page background: `bg-slate-50` (`#F8FAFC`).
  - Content card containers: `bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6`.
  - Modal backdrops: `bg-slate-900/60 backdrop-blur-xs` with clean white dialog containers (`bg-white rounded-3xl border border-slate-100 shadow-2xl`).
- **Layout Consistency**:
  - Both Public Requisition forms and Admin Portal pages must share identical container border contours, radii (`rounded-2xl` / `rounded-3xl`), and off-white backdrop tones.

---

## 📐 2. Typography Scale & Alignment Rules

### Typography Hierarchy (No Overlapping Hero Fonts)
- **Level 1 — Page Header**: `text-xl sm:text-2xl font-black text-slate-900 tracking-tight`
- **Level 2 — Card / Section Header**: `text-sm sm:text-base font-extrabold text-slate-900`
- **Level 3 — Body & Input Labels**: `text-xs font-semibold text-slate-700`
- **Level 4 — Micro-Labels & Badges**: `text-[10px] sm:text-[11px] font-bold uppercase tracking-wider`

### Alignment Protocol
- **Left-Aligned (`text-left`)**: Mandatory for data tables, form input labels, item descriptions, and lists (maintains a clean visual reading line).
- **Center-Aligned (`text-center`)**: Reserved exclusively for empty state notices, metric counter values, modal header titles, or hero banners.

---

## 🏷️ 3. Standardized Color-Coded Status Badges

All status badges across tables, lists, and modals must use high-contrast, standardized color pills with Lucide SVG indicators (no raw emojis):

| Status | Utility Classes | Icon Component |
|---|---|---|
| **`APPROVED` / `AVAILABLE`** | `bg-emerald-50 text-emerald-700 border-emerald-300 font-extrabold` | `CheckCircle2` |
| **`PENDING`** | `bg-amber-50 text-amber-700 border-amber-300 font-extrabold` | `Clock` |
| **`REJECTED`** | `bg-rose-50 text-rose-700 border-rose-300 font-extrabold` | `XCircle` |
| **`UNDER MAINTENANCE` / `MAINTENANCE`** | `bg-purple-50 text-purple-700 border-purple-300 font-extrabold` | `Wrench` |
| **`ON-GOING` / `RELEASED`** | `bg-blue-50 text-blue-700 border-blue-300 font-extrabold` | `Play` / `Clock` |
| **`COMPLETED`** | `bg-slate-100 text-slate-700 border-slate-300 font-bold` | `CheckCircle` |
| **`DAMAGED`** | `bg-rose-100 text-rose-800 border-rose-300 font-extrabold` | `AlertTriangle` |
| **`LOST`** | `bg-red-950 text-white border-red-900 font-black` | `XCircle` |
| **`SOLVED`** | `bg-emerald-600 text-white border-emerald-700 font-black` | `ShieldCheck` |

---

## 🖼️ 4. Iconography Standards (No Emojis)

- **Official Vector SVG Icons ONLY**:
  - **NEVER** use raw emoji characters (e.g. 🏢, 📦, 🟢, 🔵, 🟠, 🔴, 🛡️, ⏰, 🔧, ⛔) in production UI components.
  - Always import and render vector SVG icons from `lucide-react` (e.g. `Building2`, `PackageOpen`, `CheckCircle2`, `Clock`, `Wrench`, `ShieldAlert`, `AlertTriangle`, `XCircle`).

---

## 📊 5. Dynamic State Guardrails & Zero Hardcoded Stubs

1. **Zero Hardcoded Stubs & Mocks**:
   - Never use static mock data, hardcoded choices, or placeholder fallback arrays for dynamic system entities.
   - If 0 records exist in the database, the UI must accurately display an authentic empty state (e.g. "No records found") with clean vector icons rather than falling back to demo data or broken blank boxes.

2. **Conditional Element Rendering**:
   - Charts, department ranking bars, and statistics must ONLY render when active data records exist (`items.length > 0`).

---

## 🛠️ Verification & Hand-off Protocol

Before marking any frontend design task complete:
1. **Compilation Check**: Run `npm run build` in `frontend/` to confirm zero JSX syntax or compilation errors.
2. **Lint Validation**: Run `npm run lint` / `npx oxlint` to ensure clean imports and no unused variables.
3. **Interactive Verification**: Confirm that all buttons, modals, dropdowns, and form submits still trigger their intended callbacks.
4. **Report back**: List modified files, confirmed visual tokens, and verified build output.
