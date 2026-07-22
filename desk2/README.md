# Desk v2 — Ant Design Pro style frontend for ERPNext

A from-scratch React rewrite of the Frappe/ERPNext Desk, built with
**Vite + React 18 + antd v5 + @ant-design/pro-components + frappe-react-sdk**.
Mounts inside Frappe at `/desk2`, same-origin, reusing Frappe's login, session,
`frappe.boot`, and REST API. The original `/app` Desk is untouched.

## Quick start

### Inside a Frappe bench (production-like)

This project expects to live at `frappe-bench/apps/erpnext/desk2/` so the
`proxyOptions.ts` can read `sites/common_site_config.json` three levels up.

```bash
cd apps/erpnext/desk2
pnpm install
pnpm dev      # http://localhost:8081/desk2  (proxies /api to bench)
```

Then visit `http://<your-site>:8081/desk2` in your browser. You must already
be signed in to the bench at `http://<your-site>:8000` (the dev server shares
the cookie via the proxy).

### Production build

```bash
pnpm build
```

Outputs into `../erpnext/public/desk2/` and copies the built `index.html` to
`../erpnext/www/desk2.html`. After a `bench build` / `bench migrate`, the SPA
is served at `https://<your-site>/desk2`.

### Standalone (no bench — mock mode)

```bash
pnpm install
pnpm dev
```

When no Frappe bench is reachable, the dev server automatically falls back to
**mock mode**: a fetch interceptor (`src/mock/install.ts`) returns synthesized
boot data, doctype metadata, and sample documents for ToDo / Customer / Item /
Sales Invoice / Account. You can click through every view (list, form, report,
workspace, tree, print) and exercise the full UI without standing up Frappe.

Mock mode is **dev-only** — it never ships in the production bundle. When you
later run inside a real bench, `main.tsx` detects the bench's dev endpoint and
uses the real boot automatically (mock is skipped).

Console will show `[desk2] running in mock mode — sample data only` when mock
is active, and `[desk2] using real Frappe bench boot` when the bench is live.

## Scripts

| Command            | Purpose                                         |
| ------------------ | ----------------------------------------------- |
| `pnpm dev`         | Vite dev server (port 8081) with bench proxy    |
| `pnpm build`       | Production build → `erpnext/public/desk2/`      |
| `pnpm typecheck`   | `tsc --noEmit` over the whole project           |
| `pnpm lint`        | ESLint flat-config check                        |
| `pnpm preview`     | Preview the production build locally            |

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
│   ├── form/          FormContext (state machine) / FormLayout / ChildTable / FormActionBar
│   └── common/        LinkPicker / CommandPalette / NotificationsBell
├── form-config/       Per-doctype form customizations (replaces *.js form handlers)
├── list-config/       Per-doctype list customizations (replaces *_list.js)
├── hooks/             useDocForm + useDocEvents
├── layouts/           AuthGate + ProDeskLayout (ProLayout shell)
├── lib/               frappe / date / numbers / currency / translate / permissions / depends-on
├── pages/             FormView / ListView / ReportView / WorkspaceView / TreeView / PrintView / HomePage
├── types/             frappe.ts (DocType / DocField / FrappeDoc / BootPayload / Workspace / ...)
├── App.tsx            Provider stack + lazy routes
└── main.tsx           ConfigProvider + boot fetch
```

### Integration contract (mirrors `banking/`)

1. `index.html` is a Jinja template Frappe renders with `boot`, `csrf_token`,
   `app_name`, `lang`, `layout_direction`.
2. `erpnext/www/desk2.py` is the page controller (copy of `banking.py`'s logic).
3. `erpnext/hooks.py` `website_route_rules` routes `/desk2` and `/desk2/<path>`
   to the SPA so client-side routing owns the URL space.
4. Auth is delegated to Frappe's session cookie (`user_id`). If absent →
   hard-redirect to `/login?redirect-to=/desk2`.
5. `frappe-react-sdk`'s `FrappeProvider` reads same-origin `/api` and the
   `socketPort` / `siteName` from boot for realtime events.

### Fieldtype coverage

`components/fields/FieldRenderer.tsx` dispatches all 36 Frappe DocType
fieldtypes onto antd controls. See the [Fieldtype matrix][ft] in the plan.

[ft]: ../doc/desk2.md#fieldtype-matrix

## Adding a new doctype customization

1. **Form behaviour** (custom buttons, make_methods, link filters, validation):
   add `src/form-config/<Doctype>.tsx`, call `register('<Doctype>', config)`,
   and import it from `src/form-config/index.ts`.
2. **List behaviour** (default filters, status indicator, cell formatters,
   bulk actions): add `src/list-config/<Doctype>List.tsx`, call `register`,
   and import from `src/list-config/index.ts`.

Both registries are type-checked and tree-shaken. Doctypes without a config
still work via the generic engine — they just won't have the custom UI bits.

## What's wired (stage 1)

- ✅ Auth gate + ProLayout shell with sidebar from real Workspaces
- ✅ Generic List view (ProTable + reportview.get + filters + status indicators)
- ✅ Generic Form view (FormLayout / FieldRenderer / ChildTable / ActionBar)
- ✅ Generic Report view (query_report.run + filter rendering + CSV export)
- ✅ Workspace renderer (number_card / chart / shortcut widgets)
- ✅ Tree view (lazy expand + click-to-form)
- ✅ Print preview (iframe to Frappe's /printview)
- ✅ Command palette (Cmd/Ctrl+K → search)
- ✅ Notifications bell
- ✅ Form-config for Sales Invoice / Customer / Item
- ✅ List-config for Sales Invoice / Customer / Item / ToDo

## What's deferred (stage 2+)

- Calendar / Gantt / Kanban / Image alternate list views
- Per-doctype `fetch_from` server round-trips on field change
- Inline Code editor (Monaco), Text Editor (Quill), Geolocation (Leaflet)
- POS / Shop Floor / Bank Reconciliation Tool / other bespoke pages
- Workflow state-machine UI rendering (transitions as buttons)
- Data Import / Export wizards
- Assignment / Share / Comment timeline (currently just stubs)

See `../doc/desk2.md` for the full plan and progress.
