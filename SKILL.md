---
name: martin-dev-playbook
description: Martin's combined development playbook from ZTG POS, vocab-quest (vocab-game) and Tala-Salitaan. How to work with the user, security, verification, Laravel + React standards, UI/UX design system, money rules, caching/PWA, kid-friendly game UI, free hosting stack and Windows machine quirks. Read at the start of any work in the user's projects; apply only the sections tagged for the current project.
---

# Martin's Development Playbook

Collected from three projects:

| Project | Path | Stack | Users |
|---|---|---|---|
| **ZTG POS** (Heavy Parts POS + Smart Inventory) | `D:\PROJECTS\ZTG-POS-With-Smart-Inventory-main` | Laravel 12 API + React (Vite) | Shop staff, 30+ years old, money + BIR invoices |
| **vocab-quest / vocab-game** | `C:\Users\marti\vocab-game` | Laravel API + TypeScript/three.js game + teacher portal | Elementary pupils + teachers |
| **Tala-Salitaan** (Filipino vocab game) | `D:\PROJECTS\TALA-SALITAAN` | Laravel API + React/TS (R3F 3D) PWA | Grade-school pupils + teachers |

---

## 0. Applicability rule (read first)

Every section has a tag. **Apply a section only if its tag matches the project you are working in.**

| Tag | Applies to |
|---|---|
| `[ALL]` | Every project of this user |
| `[WEB]` | Any web app (React/Vite/Laravel or similar) |
| `[LARAVEL]` | Projects with a Laravel backend |
| `[REACT]` | Projects with a React frontend |
| `[ZTG]` | ZTG POS only (money, BIR, inventory, imports) |
| `[GAME]` | vocab-game and Tala-Salitaan (pupils, stars, maps) |
| `[3D]` | Projects with three.js / React Three Fiber scenes |
| `[FREE-STACK]` | Projects hosted on Render + TiDB + Cloudinary + Cloudflare Pages |
| `[WIN]` | Work on the user's Windows laptop |

Rules:
1. **The project's own files win.** `.agents/AGENTS.md`, `.kiro/steering/*`, the project's SKILL.md and repo-scoped memories override this playbook when they disagree.
2. **Never carry project-specific values across projects** (URLs, colors, price rules, star rules, BIR rules). Reuse the *pattern*, not the data.
3. **A rule from another project is a suggestion, not a requirement.** If unsure whether it fits (e.g. "zoom 0.9" or "kid-size buttons"), ask the user or pick the safe default and say so.
4. If a new project starts, identify which tags apply and state them in one line before working.

---

## 1. Working with the user `[ALL]`

- **Explain simply, step by step, with tables.** The user is learning. Use plain words, short sentences, real numbers.
- **Visuals = markdown tables in chat**, not mermaid/image artifacts (unless they ask for a UI mockup).
- **UI mockups must copy the real screens** (real product names, real layout), not generic tables. Use the user's screenshot as the reference.
- **Formulas:** when asked for calculations, use a table per case with columns *Formula | Sample | Result*, simple numbers (₱1,000 / ₱500, not 33,333.33), and before/after where something changed. Not copy-paste code blocks.
- **Quick questions → answer immediately**, no tool calls first. "Answer me, don't change anything" means report only.
- **"tingnan mo at ireport" / "wag ka muna mag change"** = investigate and report, no edits.
- **Don't offer A/B/C menus for minor decisions.** Pick the safe recommended option, do it, say what you chose and how to switch. Still ask before risky or hard-to-reverse actions.
- **Do multi-step work yourself**, phase by phase. Don't launch workflows: the user can't approve them in the UI.
- **Prefer free tools/services** and let the agent do the work (MCP, scripts). Check free tiers before recommending. Don't plan around rotating free accounts.
- **Be honest about sources.** Say when a document couldn't be opened (PDFs), when a link is a digest vs full text, which sources are official (`.gov.ph`) vs private. Never invent page numbers or URLs. Explain how to verify a domain (read from the right: `bir-cdn.bir.gov.ph` belongs to `bir.gov.ph`).
- **Never dismiss a reported issue** from reading code; reproduce it (headless check, test) or say it still needs verification.
- **Say what was NOT checked** (especially "not checked in a browser").

---

## 2. Safety, git and deploy `[ALL]`

- **Ask before hard-to-reverse actions:** deletes, pushes to `main`, production data, deploys, force pushes.
- **Back up before any database change** (mysqldump to a backups folder), rehearse on a scratch copy, then the real DB. Assert `SELECT DATABASE()` in scripts before writing.
- **Never put production credentials in local `.env`.** Never print secrets. Prepare env files with placeholders for the user to paste.
- **Stage files by name**, never `git add -A`. Commit bodies via a temp file + `git commit -F`.
- **When features share files, propose fewer commits** instead of guessing hunk splits.
- **Flag any change to what an existing test asserts** as a separate point before committing.
- **Temp files** (`ztg_*`, `.scratch/*`) are never committed; delete them after use.
- **Local agent skill files are never committed** (keep them in `~/.kiro/skills/` or gitignored `.kiro/skills/`).

### ZTG push convention `[ZTG]`
1. Backup old `main` to a new branch with the next ordinal: `1ST-`, `2ND-`, `3RD-BACKUP-FOR-FINALS-DEF` exist; next is `4TH-BACKUP-FOR-FINALS-DEF`. Never reuse a name. `git push origin <old-main-sha>:refs/heads/<name>`.
2. `git merge-base --is-ancestor origin/main HEAD`, then `git push origin <branch>:main` (fast-forward, no force).
3. "Commit and push on how we work" = go-ahead with the next ordinal.
4. Render runs `php artisan migrate --force` on every deploy and does NOT stop if it fails. Explain what each new migration changes; ask the user to paste the Render log for the new commit (check timestamp; `Nothing to migrate.` = no new migration).
5. Never commit: `backend/.env`, `semantic-review/`, `samples/~$*.xlsx`, `backend/clean_imports.php`, `.diagrams-tmp/`, `samples/video-sample*`, and by default `.kiro/steering/handoff.md`.

### Tala-Salitaan push convention `[GAME]`
- Push every update to **both** remotes: `git push origin main` (Render backend) and `git push cloudflare main` (Cloudflare Pages copy). Never force-push origin. Render auto-deploy may be off: verify new routes live, ask for Manual Deploy if 404.

---

## 3. Security `[WEB]` `[LARAVEL]`

- **Auth:** Laravel Sanctum tokens with expiry (`SANCTUM_EXPIRATION_MINUTES`, daily `sanctum:prune-expired`). Passwords and PINs hashed with bcrypt (model `hashed` casts), never logged, hidden in JSON.
- **Approval PINs:** one `verifyPin()` used everywhere; only ACTIVE Admin/Supervisor PINs approve (role-based). Throttle key `pin-verify|{auth()->id()}|{ip}`; lockout after 5 failures within 60 s; each failure logged as a security alert; lockout creates an admin notification.
- **Rate limits:** login 20/min per IP + per-username+IP lockout; password reset 5/hour per email; PIN 5/min.
- **Behind Cloudflare:** `trustProxies('*')` only (never `**`); copy a valid `CF-Connecting-IP` into `X-Forwarded-For` via middleware, otherwise every IP-based limit silently never triggers in production. Re-test IP limits on production.
- **Authorization:** permission-based, not role-name based (custom roles bypass role checks). Return **404, not 403**, for other users' resources (no existence leaks). Cashier sees only own transactions.
- **Input:** all validation in Form Requests (lists: scalars only, `per_page` max, dates `Y-m-d`); controllers pass `validated()` filtered by `array_intersect_key`.
- **LIKE searches:** escape `%` / `_` (ZTG: `whereContains` / `orWhereContains` macros with `ESCAPE '!'`, works on MariaDB and SQLite). Never `'like', '%'.$term.'%'`.
- **SQL:** Eloquent / bindings only. `lockForUpdate()` for stock deductions and number counters inside `DB::transaction()`.
- **XSS:** React escapes by default; any HTML built for `innerHTML` (printed receipts) must go through an `escapeHtml` util. Only static SVG strings may use `dangerouslySetInnerHTML`.
- **Uploads:** validate MIME + size, store on Cloudinary (not web root). When the portal deletes a record, delete its Cloudinary file too (check `result === 'ok'`).
- **CORS:** production allows only the real frontend origins (+ env list); previews only behind a flag.
- **Errors:** never expose SQL, class names or file paths to users (see §7 error messages). `APP_DEBUG=false` in production.
- **Known debt (ZTG audit):** tokens in localStorage, no MFA, `env()` in app code, missing security headers, no amount caps. Mention when relevant; don't silently "fix" without asking.
- **Secrets in git history:** if found, scrub (filter-repo), tell the user to rotate the credential and delete old bundles.

---

## 4. Verification and testing `[ALL]`

- **Before saying "done":** run the full backend suite (`php artisan test`, in-memory SQLite) and the frontend build (`npm run build`). Loop until clean. Report counts ("467 passed").
- **Never run PHPUnit against MySQL.** Tests use `:memory:` SQLite.
- **Tests are not proof for data features.** For imports or bulk changes, verify on real data in the local DB: row-by-row comparison against the source (temp read-only script), control totals (Excel `SUM`/`COUNTA`/`COUNTBLANK` vs SQL `SUM`/`COUNT`/`IS NULL`), structure checks, a random sample checked by a person, and a planted-error file. Wording: "for this file, all independent checks found 0 differences", never "always 100%".
- **Money/screen checks** `[ZTG]`: create REAL sales in the local DB through the real services (backup first, `MOCK-*` products, customer "MOCK n …", SI `9900xx`), covering peso/percent order and item discounts, partial refund, return, full refund in steps, void. Give the user a table of expected values per invoice and per line, and offer to restore the backup afterwards.
- **Frontend checks without a browser window:** headless only (Playwright/Edge headless, or a temp HTML page loaded in headless Chrome with the real CSS to measure overflow/positions). Never open visible browser windows.
- **Pure JS logic:** a temp `.mjs` that imports the module and writes results to a file.
- Write tests that prove the user's rule with their example numbers (e.g. ₱100,000 sale, ₱10,000 discount).

---

## 5. Backend standards `[LARAVEL]`

- **Thin controllers, services hold business logic** (`app/Services/{Module}`); validators in `Validators/`, DTOs in `DTOs/`, constants in `app/Services/Constants/` with PHPDoc.
- **Guard clauses first**, max nesting depth 3, service methods < ~60 lines, classes < ~150 lines.
- **`DB::transaction()`** around every money/stock mutation; events/broadcasts dispatched after the transaction.
- **No queries in loops:** load with one `whereIn()->get()->keyBy('id')`; bulk `createMany`/multi-row inserts; single-pass processors (validate + calculate + prepare in one loop).
- **PHP Enums** for statuses/roles (stored as VARCHAR).
- **PHPDoc** on every public method (`@param`, `@return`, `@throws`).
- **Migrations:** idempotent (`hasColumn` guards), describe whether existing rows change, nullable for "empty means not set" values. Production may be TiDB: avoid risky `change()`/renames; check the deploy log.
- **API error handling:** global handler in `bootstrap/app.php` `withExceptions` that maps Laravel's technical messages to plain sentences, keeps purposeful messages (validation, business rules), returns a reference code on 500s that is also in the log context.
- **Broadcasting (Pusher):** short timeouts; an unreachable Pusher must be logged, never thrown (a save must not fail because realtime is down).

---

## 6. Frontend architecture `[REACT]`

- **Every page is a folder:** `index.jsx` (thin shell), views/tables (pure UI via props), `modals/` (one file each, `if (!isOpen) return null`), `hooks/use<Module>.js` (all state, effects, API calls). Split hooks over ~200 lines into focused sub-hooks; the root hook keeps the same return shape.
- **Shared once used twice:** components in `shared/`, constants in `config/constants.js`.
- **One axios instance** with interceptors: attach the Bearer token, handle 401 (logout), and translate errors to plain language in one place (so every screen benefits).
- **Error boundary** at the root: a crash shows "This screen hit a problem. Your saved data is safe." + Reload, never a white page.
- **No debug output in production** (`console.log`/`console.error`), **no browser popups** (`alert`/`confirm`/`prompt`): use `confirmDialog`, `showToast`, inline errors.
- **Blast radius:** grep all consumers before changing a shared function/prop/setting; add imports immediately; remove dead references.
- **Caching by default** (see §9). Server is the source of truth for money; the screen preview must use the same formula as the server.

---

## 7. UI/UX design system `[WEB]`

### Typography
- **Font: Inter** (Google Fonts, weights 400–800); fallbacks `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`; mono `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace`; antialiased smoothing.
- Numbers, prices, part numbers: `font-variant-numeric: tabular-nums`, weight 600.
- Sizes (ZTG): page title 20/700, modal title 18/700, body/input 14/400, labels 12.5–13/500–600, table header 12.5/600 uppercase letter-spacing 0.04em, table cell 14/500, numbers 14.5/600, secondary 13/500, muted 12.5/400, section header 12/700 uppercase, buttons 13–13.5/600, placeholder 13.5 `#94A3B8`.
- Don't load fonts you don't use.

### Colors and shapes (ZTG tokens; reuse the pattern, adapt colors per project)
| Token | Value | Use |
|---|---|---|
| `--bg-canvas` | `#F8FAFC` | page background |
| `--bg-card` | `#FFFFFF` | cards, modals |
| `--border` / `--border-hover` | `#E2E8F0` / `#CBD5E1` | dividers, inputs |
| `--text-primary/secondary/muted` | `#0F172A` / `#64748B` / `#94A3B8` | text levels |
| `--primary` / hover / light | `#3B82F6` / `#2563EB` / `#EFF6FF` | actions, active state |
| `--success` | `#10B981` (light `#ECFDF5`) | paid, done, in stock |
| `--warning` | `#F59E0B` (light `#FFFBEB`) | real warnings only |
| `--danger` | `#EF4444` (light `#FEF2F2`) | delete, void, errors |
- Radius: modal 16px, audit card 14px, cards 12px, inputs/buttons 8–10px, small buttons 6px, pills/badges full.
- Shadows: sm for cards, lg for modals/dropdowns; focus ring `0 0 0 3px rgba(59,130,246,0.12–0.15)`.
- ZTG only: `body { zoom: 0.9 }` with `width/height: calc(100vw|vh / 0.9)`. If you position fixed popovers from `getBoundingClientRect()`, this zoom breaks the math; prefer absolute menus inside the row container (see below).

### Components and patterns
- **No raw emojis** in production UI; use inline SVG icons (stroke 2, consistent), never generic AI look.
- **Row actions:** an eye button + a ⋮ kebab button opening a dropdown with icons; destructive item last, red, after a divider. Never rows of many text buttons. Toggles = switch + status label. Edit = small modal; delete = styled confirm explaining consequences.
- **Kebab menu (ZTG reference = Product Management):** `position: absolute; right: 0; top: calc(100% + 6px)` inside the ⋮ container; last 2 rows open upward; table card `overflow: visible; padding-bottom: 120px` so the menu never creates a scrollbar (the "blinking" bug); Actions column fixed width (~120px) so buttons keep a margin from the right edge; ⋮ button `data-tooltip-align="right"` and hide its tooltip while the menu is open (a centered tooltip overflowed and caused a scrollbar).
- **Active tabs/chips = solid blue `var(--primary)` with white text** (like `.status-tab.active`), never black. Dropdowns = the app's own select component (ZTG `IOSSelect`), never a native `<select>`.
- **Suggestions are not warnings:** neutral white cards with blue accent; yellow/red only for real problems. Offer one-click bulk actions ("Fix all N").
- **Instant click feedback:** optimistic update, small spinner on the affected item, debounce/batch rapid clicks into one request, drop outdated answers, disable only the action that must wait.
- **Required inputs must be obvious:** full-width labeled panel, large input, auto-focus, blue normally, red only after a failed submit.
- **Readable for 30+ users** `[ZTG]`: panels/popovers large (notification panel 500px wide, max ~680px tall), row titles ~15.5px, messages ~14.5px, inputs ~40px, chips 32px that wrap (never horizontal-scroll filter rows), no icon over input text, popover directly under its trigger.
- **Notification center:** title + "N new" pill + Mark all read; All/Unread tabs; search (server-side) + date dropdown + wrapping type chips; rows = type icon, title, 2-line message, short time, one unread dot; Today/Yesterday/Earlier groups; highlight the searched word; friendly empty states ("You're all caught up", "No matching notifications" + Clear filters); badge capped at 99+.
- **Progress for long jobs:** elapsed M:SS every second, ETA smoothed with EMA (alpha 0.3), shown only after 5%, green "Completed in M:SS" badge; never recalculate time in render.
- **Error messages users can read:** offline / server waking up / timeout / session expired / no permission / record deleted / too many attempts / "Something went wrong … tell the system admin this code: ERR-XXXXXX". Keep purposeful server messages as they are.
- **Layout fixes:** match the existing reference screen exactly (measure padding/width from the reference module) instead of inventing a new component.

---

## 8. Money and business rules `[ZTG]`

- **Prices are copied exactly, never invented.** An empty price stays NULL (shown "—"), never copied from another price, never 0, and never sellable. A real ₱0 is allowed. Price 1/2 are generic slots; "Original/Retail" are only Settings labels.
- **P.O. price:** separate optional `po_price`; P.O. checkout uses it, else the price the cashier types; refused when neither.
- **Discounts are stored in pesos** (percent converted at the POS, rounded to the centavo). Item discount and order discount are mutually exclusive. A discount larger than the subtotal is refused.
- **Totals:** line = price × qty − item discount; total = Σ lines − order discount; `original_amount` frozen at checkout.
- **Refund / return = what was paid:** paid ratio = original_amount ÷ Σ(line net); refund N units = line net × ratio × N ÷ qty; capped at what is left; the last unit refunds exactly the remainder (ends at ₱0.00). Void / cancel P.O. reverse `original_amount`. The refund window preview and every report line use the same formula.
- **Invoice (VAT 12%):** VATable = amount due ÷ 1.12, VAT = due − VATable (VAT on the amount after the discount shown on the invoice, NIRC Sec. 106); "Less Discount" = order + all item discounts; reprint shows the original sale.
- **Open:** Senior/PWD should be VAT-exempt with 20% off the VAT-exclusive price (RA 9994 / RA 10754, RR 7-2010 / RR 5-2017); not built, needs the accountant.
- **BIR invoice numbering:** only TechOps switches Manual/System-generated.
- **Daily jobs** (dead stock after the configured days, reservation expiry, sales reminder) need Laravel's scheduler; BetterStack only pings `/up`.
- **Excel import:** organize plain price lists (brand/category from names, reuse existing, create missing once), typo suggestions are suggest-only, bulk writer with row-by-row fallback, retry-safe chunks, never stops on one failure, Undo removes everything the batch added.

---

## 9. Caching, scalability and PWA `[WEB]` `[GAME]` `[FREE-STACK]`

- **Caching is a default requirement**, not an optimization: going back and forth between screens must not re-fetch.
- Client: cache GET responses (memory + sessionStorage/IndexedDB), keyed by auth token, dedupe in-flight requests, invalidate only what a write affects; stale-while-revalidate (show cached instantly, refresh quietly, update only changed parts). Server: cache shared read-only content and clear on writes; ETag/304 (strip `W/` before comparing); `Cache-Control` on public endpoints; long immutable cache for hashed assets and media.
- **Prove it** with a script that counts API calls across navigation.
- **App files cached too:** Service Worker/PWA precache with versioned files; preload heavy 3D during earlier screens; keep heavy views mounted.
- **PWA recipe:** manifest (fullscreen + standalone, icons 192/512/maskable), `_headers` (assets immutable, sw.js/manifest no-cache), launch splash only in standalone, install card on touch devices at the TOP of the screen (bottom covered PLAY buttons), Android `beforeinstallprompt` + "Not now" snooze, iPhone "Share → Add to Home Screen". Tell the user to hard refresh after deploys.
- **Images:** compress before upload (max 1600px, JPEG 0.82, ≤400KB untouched, keep EXIF orientation), deliver Cloudinary images with `f_auto,q_auto,c_limit,w_…`; never transform audio/video.
- Pause polling while `document.hidden`.

---

## 10. Kid-friendly game UI `[GAME]`

- Players are elementary pupils: icon buttons always have a short word label under the icon (MAP / REPLAY / CONTINUE).
- Recreate the user's reference style closely (glossy candy-game look: gold stars, green banners, round buttons).
- Feedback stays positive even at 0 stars ("try again"), never scolding.
- Must work smoothly on all phones/tablets, portrait and landscape. Check CSS viewports 360x640, 390x844, 412x915, 440x956, 600x960, 768x1024, 800x1280, 820x1180, 1024x1366 (and rotated); show found problems before fixing.
- Screen changes animate in, never pop; repeat taps never stack toasts/results (debounce, lock while transitioning).
- One sound at a time; the next step waits for the voice (Tala: SUSUNOD disabled until praise ends).
- Children's app: review every picture visually before upload (automatic image search picked unsafe pictures).
- Stars logic is rendered in several places; change all of them; beware `stars || 3` turning 0 into gold.

## 11. 3D scenes `[3D]`

- Keep 3D light for cheap tablets: instancing, capped DPR, lite mode, preload during earlier screens.
- Find which file is LIVE before editing (vocab-game had dead-code map files; edits went into dead code twice).
- Headless WebGL checks: Edge headless with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`, wait ~6 s, `click({ force: true })` on animated elements.
- Reuse Tala-Salitaan's 3D characters/map approach for new games instead of starting over.

---

## 12. Free hosting stack `[FREE-STACK]`

- **Render (free, Docker):** sleeps when idle (cold start up to ~55 s); BetterStack pings `/up`; start script runs migrations (not fail-safe); no `php artisan optimize` (view:cache fails on API-only apps); `.sh` files LF line endings; no shell on free plan.
- **TiDB (MySQL-compatible):** TLS required (`MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt`, port 4000, user `<prefix>.root`); "insecure transport" error = missing CA; auto-increment ids jump (normal); create the database before the first migrate.
- **Cloudinary:** images + audio (audio under resource type video); delete files when records are deleted.
- **Cloudflare Pages:** `VITE_API_URL` must end with `/api` (a missing `/api` looks like a CORS error); SPA fallback default; `_headers` for caching.
- Production env: `APP_DEBUG=false`, `LOG_CHANNEL=stderr`, file cache/session, sync queue. User enters secrets in dashboards; check their pasted values for mistakes.

---

## 13. Windows laptop and agent shell `[WIN]`

- The agent shell is unreliable: commands return before finishing (exit -1), output is lost or arrives late, characters get dropped. Pattern that works: write a temp `.bat` that redirects to an **absolute** log path and ends with `echo ALLDONE`, start it (`control_pwsh_process` with `cmd /c <bat>`, or `execute_pwsh`), wait with `timeout /t N`, then read the log. Delete old logs before re-running; make scripts safe to run twice; run shell steps one at a time; end commands with ` & rem end`.
- Use absolute paths; `cd /d` inside commands; passing `cwd` often fails. Use uppercase `D:\` for Vite builds (lowercase bundled Pinia twice in one project).
- Never long `ping -n` waits (they queue and block); never edit source with PowerShell `Set-Content` (adds BOM, mangles UTF-8); delete temp files with the file tool.
- XAMPP MariaDB on **port 3307**; tools `C:\xampp\mysql\bin\mysqldump.exe` / `mysql.exe`, password via `MYSQL_PWD` env in `proc_open` (never printed). MySQL may still be starting after XAMPP opens; the laptop sometimes powers off and needs a MySQL datadir repair.
- In-process DB switch for scratch copies: `config(['database.connections.mysql.database' => '…']); DB::purge('mysql');` (overriding env in a subprocess migrated the real DB once).
- `py`/`adb` not on PATH in Kiro terminals: use full paths. Borrow Playwright from `C:/Users/marti/vocab-game/frontend-game/package.json` with `channel: 'msedge', headless: true`.
- The agent cannot write `~/.kiro/settings/mcp.json`: give the user the JSON to paste.
