# Desk v2 — Architecture & Progress

A from-scratch React rewrite of the Frappe/ERPNext Desk, living in
[`desk2/`](../desk2/). Mounted at `/desk2`, same-origin with Frappe, reusing
its login / session / `frappe.boot` / REST API. Original `/app` Desk untouched.

> **Status (2026-07-23): feature-complete.** Core engine + all bespoke pages
> + full fieldtype coverage + mock mode for standalone UI exploration.

---

## TL;DR

- **~1800 distinct pages** rendered from **22 route templates** via a
  metadata-driven engine (same architecture as Frappe Desk).
- **530 doctypes** (list + form + print), **184 reports**, **15 workspaces**,
  **15 tree views** — all auto-rendered from doctype JSON.
- **11 bespoke pages** (POS, Bank Rec, Shop Floor, Item Dashboard, Stock
  Balance, Warehouse Capacity, Sales Funnel, BOM Comparison, Visual Plant
  Floor, Import/Export, Home).
- **All client-side business logic stays on the backend** — field
  recomputation, tax math, workflow transitions are called via
  `run_doc_method` / Frappe REST. The frontend only evaluates simple
  `depends_on` visibility expressions.
- **Mock mode** for UI exploration without a running bench.

## Why a rewrite?

ERPNext's stock Desk is jQuery + Frappe Framework JS (~5k lines of controller
code in `public/js/controllers/transaction.js` alone). We wanted a modern
React + antd v5 + Pro Components UI that:

1. Reuses the **battle-tested Frappe backend** (Python doctype logic, REST API,
   Jinja print formats, workflow engine, permissions) — none of that is
   reinvented.
2. Replaces only the **rendering layer** with antd v5 components.
3. Keeps **all client-side business logic on the backend** — when a field
   change requires recomputation (tax totals, currency conversion, stock
   availability), we call `run_doc_method` and let Python recompute. The
   frontend only evaluates simple `depends_on` visibility expressions.

This mirrors what Frappe itself did with the `banking/` sub-project (React +
frappe-react-sdk), and extends it to the whole Desk.

## Tech stack

| Layer        | Choice                                                |
| ------------ | ----------------------------------------------------- |
| Framework    | React 18                                              |
| Build        | Vite 5                                                |
| UI           | antd v5 + `@ant-design/pro-components` (ProTable / ProForm / ProLayout) |
| Charts       | `@ant-design/charts` (G2-based)                       |
| Rich editors | Monaco (Code), react-quill (Text Editor), Leaflet (Geolocation) |
| State        | React Context + useReducer (form), jotai (UI)         |
| Data         | `frappe-react-sdk` (SWR-backed hooks)                 |
| Routing      | react-router v7 (lazy routes + Suspense)              |
| Backend API  | Frappe REST (`/api/resource/{doctype}` + `/api/method/{fn}`) |
| Auth         | Frappe session cookie (same-origin)                   |

## How it talks to Frappe

```
Browser ──── /desk2 (HTML) ─────► erpnext/www/desk2.py
                                   └─ injects frappe.boot + CSRF into Jinja
Browser ──── /api/* ────────────► Frappe web server (same origin)
                                   └─ frappe-react-sdk fetches with credentials
```

- **No separate auth server.** `AuthGate` checks the `user_id` cookie; if
  missing/Guest, hard-redirects to `/login?redirect-to=/desk2`.
- **No CORS.** The SPA is served by Frappe itself (from
  `erpnext/public/desk2/`), so all `/api/*` calls are same-origin.
- **Dev mode.** Vite (port 8081) proxies `/api`, `/assets`, `/files`,
  `/login` to the bench's webserver port (read from
  `sites/common_site_config.json`).
- **Mock mode.** When no bench is reachable, `main.tsx` auto-installs a fetch
  interceptor (`src/mock/install.ts`) that returns synthesized boot data +
  sample documents. The full UI is explorable without standing up Frappe.

## Route coverage (22 templates → ~1800 pages)

| Route                          | Pages covered                                           |
| ------------------------------ | ------------------------------------------------------- |
| `list/:doctype`                | **530** doctype list views (auto from meta)             |
| `form/:doctype/:name`          | **530** doctype form views × all docs                   |
| `report/:name`                 | **184** reports (Script / Query / Report Builder)       |
| `workspace/:name`              | **15** workspaces                                       |
| `tree/:doctype`                | **15** tree doctypes                                     |
| `print/:doctype/:name`         | **530** print previews (iframe to Frappe /printview)    |
| `import-export/:doctype`       | **530** data import/export wizards                      |
| `home`                         | Dashboard (greeting + quick actions + recent + stats)  |
| `pos`                          | Point of Sale (6 sub-modules)                           |
| `bank-reconciliation`          | Bank transaction matching                               |
| `shop-floor`                   | Manufacturing job-card board                            |
| `item-dashboard`              | Stock levels by item × warehouse                        |
| `stock-balance`               | Filterable stock summary                                |
| `warehouse-capacity`          | Warehouse utilization bars                              |
| `sales-funnel`                | Lead → Invoice conversion funnel                        |
| `bom-comparison`              | Side-by-side BOM diff                                   |
| `visual-plant-floor`          | Workstation layout + status                             |
| `*`                            | 404                                                     |

## Architecture

```
desk2/src/
├── api/            SWR-backed hooks wrapping Frappe REST endpoints
│   ├── meta.ts        useDocType (getdoctype)
│   ├── resource.ts    useDoc / useDocList / useFrappeCreate/Update/Delete
│   ├── search.ts      useLinkSearch (search_link for Link fields)
│   ├── report.ts      useReportMeta + useReportRun (query_report.run)
│   ├── workflow.ts    useWorkflowTransitions + useApplyWorkflow
│   ├── dashboard.ts   useNumberCard + useDashboardChart
│   └── desk.ts        useReportView (listview) / useWorkspace / useTreeChildren / useNotificationCounts
├── components/
│   ├── fields/        FieldRenderer + 36 Frappe fieldtypes on antd controls
│   ├── form/          FormContext (state machine) / FormLayout / ChildTable / FormActionBar / Timeline
│   ├── list/          AlternateViews (Kanban / Calendar / Gantt / Image)
│   └── common/        LinkPicker / CommandPalette / NotificationsBell / PageContainer / PageErrorBoundary
├── form-config/       Per-doctype form customizations (replaces *.js form handlers)
├── list-config/       Per-doctype list customizations (replaces *_list.js)
├── hooks/             useDocForm + useDocEvents + useFetchFrom
├── layouts/           AuthGate + ProDeskLayout (ProLayout shell)
├── lib/               frappe / date / numbers / currency / translate / permissions / depends-on
├── mock/              Dev-mode fetch interceptor (boot / metas / data / install)
├── pages/             18 page components (+ pos/ sub-directory with 5 POS modules)
├── types/             frappe.ts (DocType / DocField / FrappeDoc / BootPayload / Workspace / ...)
├── App.tsx            Provider stack + lazy routes + ErrorBoundary per route
└── main.tsx           ConfigProvider + boot fetch + mock fallback
```

### Key components

#### `components/form/FormContext.tsx`

The form engine core — a `useReducer`-backed state machine owning `doc`,
`originalDoc`, `dfOverrides` (runtime mutations via `set_df_property` /
`toggle_display`), `customButtons`, `errors`, `dirty`. Exposes `setValue` /
`getDf` / `isFieldVisible` / `isFieldRequired` / `isFieldReadOnly` which
re-evaluate `depends_on` expressions on every change.

#### `components/fields/FieldRenderer.tsx`

Single dispatch component mapping a `DocField` to the right antd control.
Covers all 36 Frappe fieldtypes.

#### `hooks/useFetchFrom.ts`

Resolves `fetch_from: "linkfield.fieldname"` rules server-side: when a Link
field changes, fetches the linked doc and copies the target field back.

#### `hooks/useDocForm.ts`

Page-level orchestration: loads meta + doc (parallel SWR), exposes
`save` / `submit` / `cancel` / `amend` / `remove`. After save it invalidates
list caches by SWR key.

#### `form-config/` + `list-config/`

Declarative replacements for `frappe.ui.form.on(...)` and
`frappe.listview_settings[...]`. Each doctype that needs custom UI behaviour
gets a typed TS file. The generic engine works for any doctype even without
a config.

## Fieldtype matrix (36 types)

| Frappe fieldtype  | antd control                          |
| ----------------- | ------------------------------------- |
| Data              | `Input`                               |
| Small Text / Text / Long Text | `Input.TextArea`           |
| Int / Float / Percent | `InputNumber`                     |
| Currency          | `InputNumber` + `formatCurrency`      |
| Check             | `Checkbox`                            |
| Select            | `Select`                              |
| Autocomplete      | `AutoComplete`                        |
| Link              | `LinkPicker` (search_link)            |
| Dynamic Link      | `LinkPicker` (resolved target)        |
| Date / Datetime / Time | `DatePicker` / `TimePicker`      |
| Duration          | custom `InputNumber`×3 (d/h/m/s)      |
| Password          | `Input.Password`                      |
| Color             | `ColorPicker`                         |
| Barcode           | `Input` (auto-focus for USB scanners) |
| Code / JSON       | Monaco Editor (lazy-loaded)           |
| Text Editor       | react-quill (lazy-loaded)             |
| Attach / Attach Image | `Upload.Dragger`                   |
| Image             | `<img>`                               |
| Geolocation       | Leaflet map (lazy-loaded)             |
| Signature         | `<canvas>` signature pad              |
| HTML / Heading / Read Only / Button | display components     |
| Section / Column / Tab Break | `Card` / `Row+Col` / `Tabs`  |

## Bespoke pages (11)

| Page | Original location | Lines (orig → new) |
|---|---|---|
| POS | `selling/page/point_of_sale/` (4447 lines) | 6 modules, ~750 lines TS |
| Bank Reconciliation | `accounts/doctype/bank_reconciliation_tool/` | ~215 lines |
| Shop Floor | `manufacturing/page/shop_floor/` | ~105 lines |
| Item Dashboard | `stock/dashboard/item_dashboard/` | ~82 lines |
| Stock Balance | `stock/page/stock_balance/` | ~100 lines |
| Warehouse Capacity | `stock/page/warehouse_capacity_summary/` | ~90 lines |
| Sales Funnel | `selling/page/sales_funnel/` | ~85 lines |
| BOM Comparison | `manufacturing/page/bom_comparison_tool/` (240 lines) | ~130 lines |
| Visual Plant Floor | `manufacturing/page/visual_plant_floor/` | ~110 lines |
| Data Import/Export | Frappe core | ~195 lines |
| Home | — | ~210 lines |

## What's wired

- ✅ Auth gate + ProLayout shell with sidebar from real Workspaces
- ✅ Generic List view (ProTable + reportview.get + filters + status indicators + bulk actions + view switcher)
- ✅ Generic Form view (FormLayout / FieldRenderer / ChildTable / ActionBar / Timeline / fetch_from / workflow)
- ✅ Generic Report view (query_report.run + filter rendering + CSV export)
- ✅ Workspace renderer (number_card / chart / shortcut widgets)
- ✅ Tree view (lazy expand + click-to-form)
- ✅ Print preview (iframe to Frappe's /printview)
- ✅ Command palette (Cmd/Ctrl+K → search)
- ✅ Notifications bell
- ✅ Alternate list views: Kanban / Calendar / Gantt / Image
- ✅ Rich editors: Monaco / Quill / Leaflet (lazy-loaded)
- ✅ Data Import/Export wizard
- ✅ Dynamic locale (zh / en) based on boot.lang
- ✅ Dark mode toggle
- ✅ ErrorBoundary per route + 404 page + loading skeletons
- ✅ form-config for Sales Invoice / Customer / Item + 5 framework doctypes
- ✅ list-config for 22 high-frequency doctypes
- ✅ All 11 bespoke pages
- ✅ Mock mode (no-bench UI exploration)

## Verification

```bash
cd desk2
pnpm typecheck   # passes
pnpm build       # ~25s, outputs to ../erpnext/public/desk2/
pnpm dev         # Vite serves at :8081 (auto-falls back to mock mode)
```
