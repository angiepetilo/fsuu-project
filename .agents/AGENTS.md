# Senior Frontend Design Systems Rules

## Strict Scope & Safety Boundaries
1. **Design & Styling Scope ONLY**:
   - Allowed to modify: Tailwind CSS classes, color palettes, off-white canvas backgrounds (`#F8FAFC`), typography scale, spacing, grid layouts, Lucide SVG icons, and visual presentation.
2. **ZERO Functional Regression Rule**:
   - **NEVER** alter, rename, or remove state hooks (`useState`, `useEffect`, `useCallback`), handler functions (`onClick`, `onChange`, `onSubmit`), API call methods (`api.get`, `api.post`), or navigation routing logic.

## Design Standards
- **Off-White Canvas Base (`#F8FAFC`)**: Page background `bg-slate-50`, card containers `bg-white rounded-2xl border border-slate-200/80 shadow-xs`.
- **Typography Scale**: Page header `text-xl sm:text-2xl font-black`, Section header `text-sm sm:text-base font-extrabold`, Body `text-xs font-semibold`, Badges `text-[10px] uppercase`.
- **Status Indicators**: `APPROVED` (Green), `PENDING` (Amber), `REJECTED` (Red), `UNDER MAINTENANCE` (Purple), `ON-GOING` (Blue), `COMPLETED` (Slate), `SOLVED` (Emerald).
- **Icons**: Lucide SVG icons ONLY. No emojis in UI components.
- **Dynamic State Guardrails**: Render charts, department bars, and badges ONLY when underlying records exist.
