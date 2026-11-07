# ZTG POS & Inventory — UI Design System & Styling Specification

> [!IMPORTANT]
> **ABSOLUTE SOURCE OF TRUTH: `ZTG-main` Reference Files**
> All UI implementation, component styling, color variables, and layout structures **MUST strictly follow the reference files located in the `ZTG-main` directory** (e.g., `styles.css`, `dashboard.html`, `inventory.html`, etc.). Do not invent new designs, do not rely solely on default Tailwind classes if they differ from the reference, and always prioritize the precise CSS properties, flex structures, and visual aesthetics defined in `ZTG-main`. 

This document defines the visual color scheme, typography, layout dimensions, modal structures, and component guidelines used across the ZTG Heavy Parts system UI. It serves as a unified styling specification for web developers and automated agents when building, updating, or testing system modules.

---

## 🎨 Design Tokens

### 1. Color Palette Reference
The system uses a curated, premium color palette driven by CSS variables to establish a clear hierarchy, state indications, and focus feedback.

| CSS Custom Property | Hex Code | Color Role | Visual Application & Usage |
|:---|:---|:---|:---|
| `--bg-canvas` | `#F8FAFC` | Canvas Background | Main app window backdrop. Separates floating cards and containers. |
| `--bg-sidebar` | `#1E293B` | Sidebar Background | Left global navigation panel background. |
| `--bg-sidebar-hover` | `#334155` | Sidebar Item Hover | Interactive hover feedback on sidebar menu links. |
| `--bg-card` | `#FFFFFF` | Container Background | Card backgrounds for lists, charts, forms, and product grids. |
| `--border` | `#E2E8F0` | Primary Border | Divider lines, grid borders, card outlines, and text fields. |
| `--border-hover` | `#CBD5E1` | Hovered Border | Interactive inputs and select fields on hover. |
| `--text-primary` | `#0F172A` | Primary Text | Headings, active values, currency outputs, and button text. |
| `--text-secondary` | `#64748B` | Secondary Text | Table headers, form labels, timestamps, and secondary info. |
| `--text-muted` | `#94A3B8` | Muted Text | Text placeholders, disabled options, and minor references. |
| `--primary` | `#3B82F6` | Primary Accent | Main call-to-actions, active navigation highlights, and links. |
| `--primary-hover` | `#2563EB` | Accent Hover | Hover state feedback for primary buttons and actions. |
| `--primary-light` | `#EFF6FF` | Soft Highlight | Background accent for selected rows, active pills, or alert boxes. |
| `--success` | `#10B981` | Success / Paid State | In-stock states, completed audits, positive sales indicators. |
| `--success-hover` | `#059669` | Success Hover | Hover state feedback for success-themed buttons. |
| `--success-light` | `#ECFDF5` | Soft Success Fill | Backgrounds for paid transaction badges and stock success pills. |
| `--warning` | `#F59E0B` | Warning / Low Stock | Alerts, pending audits, low-stock warnings, and deposits. |
| `--warning-hover` | `#D97706` | Warning Hover | Hover state feedback for warning-themed elements. |
| `--warning-light` | `#FFFBEB` | Soft Warning Fill | Background highlights for low stock limits or pending audits. |
| `--danger` | `#EF4444` | Danger / Stockout | Stockout notices, void actions, deletes, and refund alerts. |
| `--danger-hover` | `#DC2626` | Danger Hover | Hover state feedback for danger/void action buttons. |
| `--danger-light` | `#FEF2F2` | Soft Danger Fill | Background highlights for refunds, void states, or out-of-stock items. |

### 2. Shadows & Glow Rings
To create depth and interactive clarity:
* **Small Shadow (`--shadow-sm`):** `0 1px 2px 0 rgba(0, 0, 0, 0.05)` (Default card styling).
* **Medium Shadow (`--shadow-md`):** `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)` (Interactive states on hover).
* **Large Shadow (`--shadow-lg`):** `0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)` (Modals, suggestion panels, and dropdowns).
* **Focus Glow Ring:** `box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12)` (Triggered alongside `--primary` border on form element focus).

### 3. Typography System
Fonts are specified to keep tabular alignment clean for pricing, numbers, and part codes.
* **UI Interface Font (`--font-ui`):** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
  * Applied globally.
  * Render settings: `letter-spacing: -0.011em`, `-webkit-font-smoothing: antialiased`, and `font-feature-settings: 'tnum' 1, 'cv02' 1` (forces tabular/fixed-width numerals for clean column alignments).
* **Monospace Font (`--font-mono`):** `'JetBrains Mono', ui-monospace, monospace`
  * Applied to code fields, database keys, SKU formats, and numeric cart values.
* **Header Font:** `'Outfit', sans-serif`
  * Used for `h1` titles, log-in headers, and primary section titles to give a premium brand feel.
* **Numerical Formatting:** All tables and calculations explicitly employ `font-variant-numeric: tabular-nums` to prevent horizontal jumping on updates.

### 4. Global Viewport Zoom & Scaling (Crucial for React/SPA Layouts)
The desktop application is engineered for high information density, scaling text down slightly to fit maximum workspace content on standard screens.
* **Body Scale Factor:** `zoom: 0.9` (reduces default viewport layout size by 10%).
* **Body Sizing Adjustments:** Because `zoom: 0.9` shrinks the visual layout, you must use `width: calc(100vw / 0.9); height: calc(100vh / 0.9); overflow: hidden;` on the `body` to ensure it still fills the entire screen without leaving blank gaps on the right or bottom.
* **React/SPA Root Handling:** The `<div id="root">` should be the main flex container (`display: flex; width: 100%; height: 100%;`). Do NOT put `display: flex` on the `body` itself if there is an intermediate root container.
* **Page & Sidebar Wrappers (The React Router Issue):** React Router (`BrowserRouter`, `Routes`) renders intermediate `<div>` wrappers that silently break standard `height: 100%` inheritance chains. 
  * **Rule:** All top-level page containers (e.g., `<div className="flex overflow-hidden bg-[#F8FAFC]">`) and the `Sidebar` MUST explicitly use `style={{ height: 'calc(100vh / 0.9)' }}` instead of Tailwind's `h-screen` or `h-full`. This viewport-unit approach forces the container to perfectly fill the screen regardless of the broken router wrapper chain.

### 5. Border Radius & Sizing Standards
To maintain modern visual consistency, the interface strictly implements specific roundness hierarchies and layout boundaries:

* **Border Radius (`border-radius`) Rules:**
  * **Circular / Rounded-Full (`50%` / `9999px`):** Used for navigation pills (`.filter-pill`), toggle inputs, notification badges (`.notif-badge`), scrollbar thumbs, and user profile pictures (`.user-avatar`).
  * **Splash Dialogs (`24px`):** Used for primary system entry surfaces (`.login-card`).
  * **Standard Dialogs / Modals (`16px`):** Used for standard configuration modal cards (`.modal-card`), custom setting forms.
  * **Log Audit Containers (`14px`):** Used for audit history detail logs (`.audit-detail-card`).
  * **Cards / Core Blocks (`12px`):** Used for standard layout cards (`.card`), role selection selectors, summary totals widgets (`.totals-box`), settings tabs panel wrappers, and notification dropdown boxes.
  * **Specialty Inputs / Badges (`10px`):** Used for product list cards (`.product-card`), iOS-style picker inputs (date, time, datetime-local), alerts (`.alert-banner`), profile photo frames, read-only labels.
  * **Standard Controls / Inputs (`8px`):** Used for standard buttons (`.btn`), text fields (`.form-control`), selection boxes, search fields, suggestions list container.
  * **Action Buttons / Tags (`6px`):** Used for small buttons (`.btn-sm`), quantity control actions (`.qty-btn`), tooltip boxes.

* **Layout Dimensions & Height Standards:**
  * **Navigation Sidebar:** Width `260px`, flex-shrink `0`. Nav lists item margins `4px`, links padding `10px 12px`. Footer section profile avatar `38px` diameter.
  * **Action Top Bar Header:** Height `70px`, horizontal padding `32px`.
  * **General Body Padding:** `32px` on all layout edges.
  * **POS Workspace Split Grid:** Catalog panel takes up `1fr`, Checkout side panel is exactly `400px` wide. POS grid height is `calc(100vh - 170px)`.
  * **Scrollbar Thickness:** Width/Height `8px`, thumb scroll pointer rounded.
  * **Interactive Inputs:** Standard form text fields and selectors height `42px` (padding `10px 14px`). Large input wrappers (e.g. login username/password fields) height `46px` (padding-left `44px`).
  * **iOS Toggles:** Width `44px`, height `24px`. Knob slider radius `18px`, top/left gaps `3px`.
  * **Table Cells Spacing:** Header row bar padding `20px 24px`, table heading column paddings `12px 24px`, body data cells padding `16px 24px`.

---

## 📐 Layout & Page Blueprints

### 1. The Global Page Shell
All page views are built around a two-column shell (Sidebar navigation + Main content area).

```
┌────────────────────────┬─────────────────────────────────────────────────────────────────┐
│                        │                           Top Bar                               │
│                        ├─────────────────────────────────────────────────────────────────┤
│                        │                                                                 │
│                        │                                                                 │
│   Sidebar Navigation   │                          Main Workspace                         │
│       (260px)          │                          (Scrollable)                           │
│                        │                                                                 │
│                        │                                                                 │
│                        │                                                                 │
└────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

#### Left Navigation Sidebar
* **Width:** `260px` (flex-shrink: `0` to prevent compression).
* **Styling:** Background `var(--bg-sidebar)` (`#1E293B`) with a right border: `1px solid rgba(255, 255, 255, 0.05)`.
* **Nav Links:** Vertical stack with `4px` gap. Items use padding `10px 12px`, SVG icons at `18px × 18px` with stroke width `2`.
  * **Default State:** Text/icon color is `var(--text-muted)` (`#94A3B8`). On hover, background transitions to `var(--bg-sidebar-hover)` (`#334155`), text/icons highlight to `#FFFFFF`.
  * **Active State (`.nav-link.active`):** Background color is `var(--primary)` (`#3B82F6`), text color is `#FFFFFF`, and the active SVG icon stroke turns to `#FFFFFF`.
* **User Profile & Footer:** Sticky bottom section with `38px` user avatar and active role indicator. Features a top border: `1px solid rgba(255, 255, 255, 0.06)`.

#### Top Bar Action Header
* **Height:** `70px` (flex-shrink: `0`).
* **Styling:** Background `var(--bg-card)` (`#FFFFFF`) with bottom border `1px solid var(--border)` (`#E2E8F0`).
* **Spacing:** Padding `0 32px`. Align-items: `center`. Space-between layout for titles and user/system status selectors.

#### Scrollable Main Body
* **Padding:** `32px` on all sides.
* **Scrollbars:** Tailored high-contrast scrollbars for quick scrolling:
  * Width/Height: `8px`.
  * Track background: `transparent` to avoid layout visual noise.
  * Scroll thumb: `var(--border-hover)` (`#CBD5E1`), darkening to `var(--text-muted)` (`#94A3B8`) on pointer hover.

### 2. Grid System Specifications
Page templates utilize standard CSS grids to manage consistency:
* **Three-Column Grid (`.grid-3`):** `grid-template-columns: repeat(3, 1fr); gap: 24px;`
* **Four-Column Grid (`.grid-4`):** `grid-template-columns: repeat(4, 1fr); gap: 24px;`
* **Profile & Settings Grid (`.profile-page-grid`):** `grid-template-columns: 280px 1fr; gap: 20px;` (collapses to `1fr` below `900px` screens).
* **Form Field Layouts:** `.profile-form-grid` uses `1fr 1fr` with `16px` gaps, and `.profile-form-grid-3` uses `repeat(3, 1fr); gap: 16px;`.

---

## 🔍 Module Layout Details

### 1. Point of Sale (POS) Interface (`pos.html`)
The POS window uses a split-pane structure to separate item lookup from checkout commands.
* **Parent Grid Layout (`.grid-pos`):** `grid-template-columns: 1fr 400px; gap: 24px; height: calc(100vh - 170px);`
* **Left Catalog Panel:**
  * Uses search box with auto-suggestion overlays.
  * Category selector pills: height approx. `36px`, rounded `9999px`.
  * Product grid uses autofill: `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;`.
  * Product card details: Padding `16px`, background `#FFFFFF`, border-radius `10px`.
* **Right Checkout Sidebar:**
  * Width: `400px` (uses `flex-direction: column` to fill container).
  * Cart list pane: Takes up `flex: 1` space. Features `20px` internal padding.
  * Cart items (`.cart-item`): Bottom padding `16px`, margin bottom `16px`, separator border bottom `1px solid var(--border)`.
  * Quantity adjust buttons (`.qty-btn`): `26px × 26px`, border radius `6px`.
  * Checkout summary: Fixed bottom block with background `var(--bg-canvas)` (`#F8FAFC`), top border `1px solid var(--border)`, and checkout action fields in a `2-column` grid.

### 2. Product & Settings Management (`settings.html`)
* **Page Layout:** Flex column layout (`.settings-page-body`) with scrollable body area and a sticky footer bar.
* **Sticky Footer Actions (`.settings-actions-bar`):** Position `sticky`, bottom `0`, background `var(--bg-card)` (`#FFFFFF`) with top border `1px solid var(--border)` (`#E2E8F0`) and `16px 0` padding. Prevents page scrolls from hiding save buttons.

---

## 🪟 Modal Overlay & Dialog Blueprint

Modals utilize animated overlay containers to prompt overlays without navigation loss.

```
┌─────────────────────────────────────────────────────────┐
│                   Modal Overlay (blur 4px)              │
│                                                         │
│         ┌─────────────────────────────────────┐         │
│         │ Modal Card (max-width: 540/680px)   │         │
│         ├─────────────────────────────────────┤         │
│         │ Modal Header                        │         │
│         ├─────────────────────────────────────┤         │
│         │ Modal Body                          │         │
│         │ (max-height: 70vh, scrollable)      │         │
│         ├─────────────────────────────────────┤         │
│         │ Modal Footer (F8FAFC)               │         │
│         └─────────────────────────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 1. Overlay & Backdrop Specifications
* **Container Class:** `.modal-overlay`
* **Styling:** `position: fixed; inset: 0; background-color: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); z-index: 9999;`
* **Activation Behavior:** Opacity transitions from `0` to `1` with pointer-events toggled to `auto`.
  * Active state triggers: `.modal-overlay.active`

### 2. Entrance Animation
* **Animation Transition:** The modal card transitions smoothly:
  * Inactive state: `transform: translateY(20px) scale(0.95); transition: transform 0.2s ease, opacity 0.2s ease;`
  * Active state: `.modal-overlay.active .modal-card { transform: translateY(0) scale(1); }`

### 3. Modal Sizing Classes
To maintain clean proportions depending on modal usage:
1. **Standard Dialog (`.modal-card`):** `max-width: 540px; width: 100%; border-radius: 16px;`
   * *Usage:* Deletes, warnings, simple configuration fields, void actions.
2. **Audit / Detail Dialog (`.audit-detail-card`):** `max-width: 680px; width: 95%; border-radius: 14px;`
   * *Usage:* Logs lookup, individual transaction invoice viewing.
3. **Large Form Dialog (`.modal-card.modal-card-lg`):** `max-width: 1300px; width: 95%; border-radius: 16px;`
   * *Usage:* Refund / return workflow interface, inventory bulk intake logs.

### 4. Inner Structural Padding
* **Modal Header:** Padding `24px` with border bottom `1px solid var(--border)`. Compact mode uses `14px 20px` padding with `#F8FAFC` background.
* **Modal Close Button:** Absolute positioning or flex item, uses `20px` SVG size with line width `2`.
* **Modal Body:** Padding `24px`. Restricted max-height: `70vh` (with custom vertical scrolling).
* **Modal Footer:** Padding `20px 24px` with background `var(--bg-canvas)` (`#F8FAFC`) and top border `1px solid var(--border)`. Flexbox layout aligned to `flex-end` with a `12px` gap.

---

## 🧩 Interactive Input & Component Details

### 1. Form Inputs
* **Padding:** `10px 14px` on standard inputs.
* **Border Radius:** `8px` or `10px` for high-density modern feels.
* **Date & Time Controls:** Webkit date indicators have default browser picker icons set to `opacity: 0.55`. Input container has `min-height: 42px` and starts with background `#F8FAFC`.
* **Focus Ring Transition:** Focused controls transition background to `#FFFFFF`, border-color to `var(--primary)` and apply the Glow Ring (`box-shadow`).

### 2. iOS-Style Toggle Switches
Checkbox toggles replace bulky inputs for flags and settings:
* **Mechanism:** Checkboxes styled with `appearance: none; width: 44px; height: 24px; border-radius: 12px; background: #CBD5E1; transition: background 0.2s ease;`
* **Knob:** Inner circle `::before` sized `18px × 18px` with transition `transform 0.2s ease`.
* **Checked State:** Checked class changes background color to `var(--success)` (`#10B981`) and moves knob knob via `transform: translateX(20px)`.

### 3. Product Search Suggestions Box (`.product-suggestions`)
* **Positioning:** `position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 100;`
* **Dimensions:** Restricted max-height `240px` with overflow-y `auto`.
* **Elements:** Items use padding `10px 14px`, separate borders `1px solid #F1F5F9`. Features bold primary price colored `var(--primary)` and stock level alerts colored according to active status thresholds.

### 4. Custom Tooltips (`[data-tooltip]`)
* **Styling:** CSS-driven tooltips that load from markup attributes:
  * Element styling: `[data-tooltip] { position: relative; }`
  * Text block styling: `[data-tooltip]::before` uses `background: #0F172A; color: #FFFFFF; font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 6px;`
  * Arrow styling: `[data-tooltip]::after` with transparent matching borders.
* **Animation:** Smooth scaling transition: `transform: translate(-50%, 4px) scale(0.95) -> transform: translate(-50%, 0) scale(1)`.

### 5. Page Navigation Tabs (`.tab-btn`)
Used to navigate sections/tables within pages (e.g. inventory alerts, settings):
* **Default State:** Color `var(--text-secondary)` (`#64748B`), font-size `14px`, font-weight `600`, with transparent bottom border. On hover, color transitions to `var(--text-primary)` (`#0F172A`).
* **Active State (`.tab-btn.active`):** Color highlights to `var(--primary)` (`#3B82F6`) and gains a solid bottom border indicator: `border-bottom-color: var(--primary)` (`#3B82F6`) with width `2px`.

---

## 💻 Tech-Stack Adaptations

### Tailwind CSS Color & Sizing Config
Extend your `tailwind.config.js` to cover the entire design system and spacing definitions:
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        canvas: '#F8FAFC',
        sidebar: {
          DEFAULT: '#1E293B',
          hover: '#334155',
        },
        card: '#FFFFFF',
        border: {
          DEFAULT: '#E2E8F0',
          hover: '#CBD5E1',
        },
        text: {
          primary: '#0F172A',
          secondary: '#64748B',
          muted: '#94A3B8',
        },
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          light: '#EFF6FF',
        },
        success: {
          DEFAULT: '#10B981',
          hover: '#059669',
          light: '#ECFDF5',
        },
        danger: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
          light: '#FEF2F2',
        },
        warning: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
          light: '#FFFBEB',
        },
      },
      spacing: {
        'sidebar-w': '260px',
        'topbar-h': '70px',
      },
      fontFamily: {
        ui: ['Inter', 'sans-serif'],
        brand: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'sm-custom': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md-custom': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'lg-custom': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
      }
    }
  }
}
```

### Kotlin (Jetpack Compose / Android)
```kotlin
package com.ztg.pos.ui.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

// Canvas & Container
val BgCanvas = Color(0xFFF8FAFC)
val BgSidebar = Color(0xFF1E293B)
val BgSidebarHover = Color(0xFF334155)
val BgCard = Color(0xFFFFFFFF)
val Border = Color(0xFFE2E8F0)
val BorderHover = Color(0xFFCBD5E1)

// Text Shades
val TextPrimary = Color(0xFF0F172A)
val TextSecondary = Color(0xFF64748B)
val TextMuted = Color(0xFF94A3B8)

// Brand Accents
val Primary = Color(0xFF3B82F6)
val PrimaryHover = Color(0xFF2563EB)
val PrimaryLight = Color(0xFFEFF6FF)

// Status Alerts
val Success = Color(0xFF10B981)
val SuccessHover = Color(0xFF059669)
val SuccessLight = Color(0xFFECFDF5)

val Danger = Color(0xFFEF4444)
val DangerHover = Color(0xFFDC2626)
val DangerLight = Color(0xFFFEF2F2)

val Warning = Color(0xFFF59E0B)
val WarningHover = Color(0xFFD97706)
val WarningLight = Color(0xFFFFFBEB)

// Component Dimensions
val SidebarWidth = 260.dp
val TopBarHeight = 70.dp
val POSCheckoutWidth = 400.dp
val ModalStandardWidth = 540.dp
val ModalAuditWidth = 680.dp
val ModalLargeWidth = 1300.dp
```

### Swift (SwiftUI / iOS)
```swift
import SwiftUI

extension Color {
    // Canvas & Container
    static let bgCanvas = Color(hex: "F8FAFC")
    static let bgSidebar = Color(hex: "1E293B")
    static let bgSidebarHover = Color(hex: "334155")
    static let bgCard = Color(hex: "FFFFFF")
    static let border = Color(hex: "E2E8F0")
    static let borderHover = Color(hex: "CBD5E1")
    
    // Text Shades
    static let textPrimary = Color(hex: "0F172A")
    static let textSecondary = Color(hex: "64748B")
    static let textMuted = Color(hex: "94A3B8")
    
    // Brand Accents
    static let primaryAccent = Color(hex: "3B82F6")
    static let primaryHover = Color(hex: "2563EB")
    static let primaryLight = Color(hex: "EFF6FF")
    
    // Status Alerts
    static let success = Color(hex: "10B981")
    static let successHover = Color(hex: "059669")
    static let successLight = Color(hex: "ECFDF5")
    
    static let danger = Color(hex: "EF4444")
    static let dangerHover = Color(hex: "DC2626")
    static let dangerLight = Color(hex: "FEF2F2")
    
    static let warning = Color(hex: "F59E0B")
    static let warningHover = Color(hex: "D97706")
    static let warningLight = Color(hex: "FFFBEB")
}

struct LayoutDimensions {
    static let sidebarWidth: CGFloat = 260
    static let topBarHeight: CGFloat = 70
    static let posCheckoutWidth: CGFloat = 400
    static let modalStandardWidth: CGFloat = 540
    static let modalAuditWidth: CGFloat = 680
    static let modalLargeWidth: CGFloat = 1300
}
```

### C# (MAUI / WPF / Windows Form)
```csharp
namespace ZTG.POS.Theme
{
    public static class ColorPalette
    {
        // Canvas & Container
        public static string BgCanvas = "#F8FAFC";
        public static string BgSidebar = "#1E293B";
        public static string BgSidebarHover = "#334155";
        public static string BgCard = "#FFFFFF";
        public static string Border = "#E2E8F0";
        public static string BorderHover = "#CBD5E1";
        
        // Text Shades
        public static string TextPrimary = "#0F172A";
        public static string TextSecondary = "#64748B";
        public static string TextMuted = "#94A3B8";
        
        // Brand Accents
        public static string Primary = "#3B82F6";
        public static string PrimaryHover = "#2563EB";
        public static string PrimaryLight = "#EFF6FF";
        
        // Status Alerts
        public static string Success = "#10B981";
        public static string SuccessHover = "#059669";
        public static string SuccessLight = "#ECFDF5";
        
        public static string Danger = "#EF4444";
        public static string DangerHover = "#DC2626";
        public static string DangerLight = "#FEF2F2";
        
        public static string Warning = "#F59E0B";
        public static string WarningHover = "#D97706";
        public static string WarningLight = "#FFFBEB";
    }

    public static class LayoutDimensions
    {
        public const double SidebarWidth = 260.0;
        public const double TopBarHeight = 70.0;
        public const double POSCheckoutWidth = 400.0;
        public const double ModalStandardWidth = 540.0;
        public const double ModalAuditWidth = 680.0;
        public const double ModalLargeWidth = 1300.0;
    }
}
```
