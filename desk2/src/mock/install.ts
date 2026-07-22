/**
 * Dev-mode fetch interceptor — installs a mock Frappe backend so the SPA can
 * run without an actual bench.
 *
 * Strategy: monkey-patch `window.fetch`. Match the URL against the Frappe
 * endpoint patterns we know; for each match, return a synthesized JSON
 * response. For unmatched URLs, fall through to the real fetch (which will
 * 404 in dev without a bench, but that's fine).
 *
 * Recognized endpoints:
 *   GET  /api/method/frappe.desk.form.load.getdoctype?doctype=X
 *   GET  /api/resource/{doctype}                      (list)
 *   GET  /api/resource/{doctype}/{name}               (single doc)
 *   POST /api/resource/{doctype}                      (create)
 *   PUT  /api/resource/{doctype}/{name}               (update)
 *   POST /api/method/frappe.desk.reportview.get       (listview)
 *   GET  /api/method/frappe.desk.search.search_link   (link field search)
 *   GET  /api/method/frappe.desk.desktop.get_workspace_sidebar_items
 *   GET  /api/method/frappe.desk.desktop.get_workspace?name=X
 *   GET  /api/method/frappe.desk.doctype.number_card.number_card.get_result
 *   GET  /api/method/frappe.desk.dashboard.chart.get
 *
 * The interceptor is a no-op in production builds.
 */

import { MOCK_DOCS } from './data';
import { MOCK_METAS, getDocTypeResponse } from './metas';
import type { FrappeDoc } from '@/types/frappe';

const installed = Symbol('desk2.mock.installed');

interface Options {
	/** When true, log every intercepted request to the console. */
	verbose?: boolean;
}

export function installMockBackend(opts: Options = {}): void {
	const w = window as unknown as Record<typeof installed, boolean | undefined>;
	if (w[installed]) return;
	w[installed] = true;

	const realFetch = window.fetch.bind(window);
	const verbose = opts.verbose ?? false;

	window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
		const method = (init?.method ?? (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET')).toUpperCase();

		const handled = handle(url, method, init);
		if (handled) {
			if (verbose) console.debug('[mock]', method, url, '→', handled.status);
			return Promise.resolve(handled);
		}
		// Fall through to real network (will usually 404 in dev without bench).
		if (verbose) console.warn('[mock] pass-through', method, url);
		return realFetch(input as RequestInfo, init);
	};

	console.info('[desk2] mock backend installed — visit /desk2 to explore the UI with sample data.');
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

/** Parse the query string out of a URL. */
function queryOf(url: string): URLSearchParams {
	const q = url.split('?')[1] ?? '';
	return new URLSearchParams(q);
}

/** Parse the JSON body of a POST/PUT request safely. */
function parseBody(init?: RequestInit): Record<string, unknown> {
	if (!init?.body) return {};
	try {
		return typeof init.body === 'string' ? JSON.parse(init.body) : {};
	} catch {
		return {};
	}
}

function handle(url: string, method: string, init?: RequestInit): Response | null {
	// Only intercept Frappe-shaped requests.
	if (!url.includes('/api/') && !url.includes('get_context_for_dev') && !url.includes('logout')) return null;

	// ---------- /api/method/* ----------

	const methodMatch = url.match(/\/api\/method\/([\w.]+)/);
	if (methodMatch) {
		const fn = methodMatch[1];
		const q = queryOf(url);
		const body = parseBody(init);

		// boot-for-dev (called by main.tsx in dev)
		if (fn === 'erpnext.www.desk2.get_context_for_dev') {
			return jsonResponse({ message: { boot: JSON.stringify({ sitename: 'demo', user: { name: 'admin@demo.com', full_name: 'Demo Administrator', roles: ['Administrator'] }, sysdefaults: {} }), layout_direction: 'ltr' } });
		}

		if (fn === 'frappe.desk.form.load.getdoctype') {
			const doctype = (q.get('doctype') ?? body.doctype) as string;
			const r = getDocTypeResponse(doctype);
			if (!r) return jsonResponse({ docs: [] });
			return jsonResponse(r);
		}

		if (fn === 'frappe.desk.reportview.get') {
			const doctype = (q.get('doctype') ?? body.doctype) as string;
			const rows = MOCK_DOCS[doctype] ?? [];
			return jsonResponse({ data: rows, values: {}, total_count: rows.length, last: true });
		}

		if (fn === 'frappe.desk.search.search_link') {
			const txt = (q.get('txt') ?? body.txt ?? '').toString().toLowerCase();
			const doctype = (q.get('doctype') ?? body.doctype) as string;
			const rows = MOCK_DOCS[doctype] ?? [];
			const hits = rows
				.filter((r) => String(r.name).toLowerCase().includes(txt))
				.slice(0, 10)
				.map((r) => ({ value: String(r.name), label: String(r.name), description: '' }));
			return jsonResponse({ message: hits });
		}

		// ---------- Timeline endpoints ----------

		if (fn === 'frappe.desk.form.load.get_comments') {
			const refName = q.get('reference_name') ?? body.reference_name;
			// Return 1-2 sample comments for any doc.
			return jsonResponse({
				message: [
					{ name: 'CMT-001', owner: 'admin@demo.com', creation: new Date(Date.now() - 86400000).toISOString(), content: '<p>Reviewed — looks good.</p>', comment_type: 'Comment', reference_name: refName },
					{ name: 'CMT-002', owner: 'admin@demo.com', creation: new Date(Date.now() - 3600000 * 5).toISOString(), content: '<p>Please follow up next week.</p>', comment_type: 'Comment', reference_name: refName },
				],
			});
		}

		if (fn === 'frappe.desk.form.load.get_attachments') {
			return jsonResponse({
				message: [
					{ name: 'FILE-001', file_name: 'invoice.pdf', file_url: '/files/invoice.pdf', owner: 'admin@demo.com', creation: new Date().toISOString(), file_size: 102400, is_private: 0 },
				],
			});
		}

		if (fn === 'frappe.desk.form.assign_to.get') {
			return jsonResponse({ message: [] });
		}

		if (fn === 'frappe.client.get_list') {
			// Used by the Timeline for Version records (field-change history).
			const targetDoctype = (q.get('doctype') ?? body.doctype) as string;
			if (targetDoctype === 'Version') {
				return jsonResponse({
					message: [
						{ name: 'VER-001', owner: 'admin@demo.com', creation: new Date(Date.now() - 86400000 * 2).toISOString(), data: JSON.stringify({ changed: [['status', 'Draft', 'Submitted']] }) },
					],
				});
			}
			const rows = MOCK_DOCS[targetDoctype] ?? [];
			return jsonResponse({ message: rows });
		}

		if (fn === 'frappe.desk.form.tagger.add_comment') {
			return jsonResponse({ message: { name: `CMT-${Date.now()}`, owner: 'admin@demo.com', creation: new Date().toISOString() } });
		}

		if (fn === 'frappe.model.open_mapped_doc') {
			// Return a fake target so the Sales Invoice "Create→Payment" etc. navigates.
			return jsonResponse({ message: { doctype: 'Payment Entry', name: `PE-MOCK-${Math.floor(Math.random() * 10000)}` } });
		}

		// ---------- Bespoke page endpoints ----------

		if (fn === 'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_bank_transactions') {
			return jsonResponse({
				message: [
					{ name: 'BT-001', date: '2026-07-15', description: 'Customer Payment - Acme', deposit: 2032.35, withdrawal: 0, status: 'Unreconciled', party: 'CUST-001', party_type: 'Customer' },
					{ name: 'BT-002', date: '2026-07-16', description: 'Office Supplies', deposit: 0, withdrawal: 450, status: 'Unreconciled', party: 'SUPP-001', party_type: 'Supplier' },
					{ name: 'BT-003', date: '2026-07-18', description: 'Salary', deposit: 0, withdrawal: 12000, status: 'Unreconciled' },
					{ name: 'BT-004', date: '2026-07-20', description: 'Customer Payment - Globex', deposit: 5029.5, withdrawal: 0, status: 'Unreconciled', party: 'CUST-002', party_type: 'Customer' },
				],
			});
		}

		if (fn?.includes('get_matching_vouchers')) {
			return jsonResponse({
				message: [
					{ name: 'PE-001', doctype: 'Payment Entry', date: '2026-07-14', amount: 2032.35, party: 'CUST-001' },
					{ name: 'PE-002', doctype: 'Payment Entry', date: '2026-07-15', amount: 1950, party: 'CUST-001' },
				],
			});
		}

		if (fn?.includes('reconcile_vouchers')) {
			return jsonResponse({ message: 'ok' });
		}

		if (fn?.includes('get_job_cards_for_shop_floor')) {
			return jsonResponse({ message: null });
		}

		if (fn?.includes('point_of_sale')) {
			// POS endpoints — return mock data for each sub-method.
			if (fn.includes('check_opening_entry')) {
				// Return an opening entry so the gate passes and the page is usable.
				return jsonResponse({ message: { opening_entry: 'POS-OPEN-001', pos_profile: 'POS-001' } });
			}
			if (fn.includes('create_opening_voucher')) {
				return jsonResponse({ message: { name: `POS-OPEN-${Math.floor(Math.random() * 1000)}` } });
			}
			if (fn.includes('get_pos_profile_data')) {
				return jsonResponse({
					message: {
						name: 'POS-001', company: 'Demo Company', customer: 'Walk-in Customer',
						warehouse: 'Stores - DC', currency: 'CNY', price_list: 'Standard Selling',
					},
				});
			}
			if (fn.includes('get_items')) {
				return jsonResponse({ message: null });
			}
			if (fn.includes('submit_invoice')) {
				return jsonResponse({ message: { name: `POS-INV-${Math.floor(Math.random() * 10000)}`, grand_total: 0 } });
			}
			if (fn.includes('set_customer')) {
				return jsonResponse({ message: 'ok' });
			}
			if (fn.includes('get_past_order_list')) {
				return jsonResponse({
					message: [
						{ name: 'POS-INV-2026-0001', customer: 'CUST-001', grand_total: 199, status: 'Paid', posting_date: '2026-07-20' },
						{ name: 'POS-INV-2026-0002', customer: 'Walk-in', grand_total: 89, status: 'Paid', posting_date: '2026-07-20' },
						{ name: 'POS-INV-2026-0003', customer: 'CUST-003', grand_total: 350, status: 'Draft', posting_date: '2026-07-21' },
						{ name: 'POS-INV-2026-0004', customer: 'CUST-002', grand_total: 99.5, status: 'Return', posting_date: '2026-07-21' },
					],
				});
			}
			return jsonResponse({ message: null });
		}

		if (fn?.includes('item_dashboard') && fn.includes('get_data')) {
			return jsonResponse({ message: null });
		}

		if (fn?.includes('sales_funnel') && fn.includes('get_funnel_data')) {
			return jsonResponse({ message: null });
		}

		if (fn?.includes('bom') && fn.includes('get_bom_diff')) {
			return jsonResponse({
				message: {
					changed: {
						BOM: [['quantity', 10, 12], ['operating_cost', 500, 650]],
						'BOM Item': [['qty', 2, 3]],
					},
					added: {
						'BOM Item': [
							{ item_code: 'ITEM-007', qty: 5, rate: 35, amount: 175, stock_uom: 'Nos' },
						],
					},
					removed: {
						'BOM Item': [
							{ item_code: 'ITEM-004', qty: 1, rate: 49.99, amount: 49.99, stock_uom: 'Nos' },
						],
					},
				},
			});
		}

		if (fn?.includes('stock_balance') && fn.includes('get_data')) {
			return jsonResponse({ message: null });
		}

		if (fn?.includes('warehouse_capacity') && fn.includes('get_data')) {
			return jsonResponse({ message: null });
		}

		if (fn?.includes('visual_plant_floor') && fn.includes('get_workstations')) {
			return jsonResponse({ message: null });
		}

		if (fn === 'frappe.desk.desktop.get_workspace_sidebar_items') {
			return jsonResponse({ message: WORKSPACE_LIST });
		}

		if (fn === 'frappe.desk.desktop.get_workspace') {
			const name = (q.get('name') ?? body.name) as string;
			const ws = WORKSPACES[name] ?? WORKSPACES['Home'];
			return jsonResponse({ message: ws, docs: [ws] });
		}

		if (fn === 'frappe.desk.doctype.number_card.number_card.get_result') {
			return jsonResponse({ value: Math.floor(Math.random() * 100) + 10, formatted_value: String(Math.floor(Math.random() * 100) + 10), label: 'Sample' });
		}

		if (fn === 'frappe.desk.dashboard.chart.get') {
			return jsonResponse({
				labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
				datasets: [{ name: 'Revenue', values: [120, 180, 150, 240, 200, 290] }],
				chart: { type: 'Line' },
			});
		}

		if (fn === 'frappe.desk.doctype.notification_log.notification_log.get_notifications') {
			return jsonResponse({
				open_count_doctype: {
					ToDo: MOCK_DOCS['ToDo']?.filter((d) => d.status === 'Open').length ?? 0,
					'Sales Invoice': MOCK_DOCS['Sales Invoice']?.filter((d) => d.status === 'Unpaid' || d.status === 'Overdue').length ?? 0,
				},
			});
		}

		if (fn === 'frappe.model.workflow.get_transitions') {
			return jsonResponse({ message: [] });
		}

		if (fn === 'frappe.desk.query_report.run' || fn === 'frappe.desk.query_report.get') {
			return jsonResponse({ result: [], columns: [], filters: [] });
		}

		if (fn === 'logout') {
			return jsonResponse({ message: 'ok' });
		}

		if (fn === 'frappe.translate.get_boot_translations') {
			return jsonResponse({ message: {} });
		}

		if (fn === 'frappe.core.doctype.user.user.switch_theme') {
			return jsonResponse({ message: 'ok' });
		}

		// Default for unknown whitelisted methods: empty success.
		return jsonResponse({ message: null });
	}

	// ---------- /api/resource/{doctype}[/{name}] ----------

	const resourceMatch = url.match(/\/api\/resource\/([^/?]+)(?:\/([^/?]+))?/);
	if (resourceMatch) {
		const doctype = decodeURIComponent(resourceMatch[1]);
		const name = resourceMatch[2] ? decodeURIComponent(resourceMatch[2]) : undefined;
		const rows = MOCK_DOCS[doctype] ?? [];

		// GET /api/resource/{doctype}  → list
		if (method === 'GET' && !name) {
			return jsonResponse({ data: rows });
		}

		// GET /api/resource/{doctype}/{name}  → single
		if (method === 'GET' && name) {
			const doc = rows.find((r) => r.name === name);
			if (!doc) return jsonResponse({ message: 'Not found' }, 404);
			return jsonResponse({ data: doc });
		}

		// POST /api/resource/{doctype}  → create
		if (method === 'POST' && !name) {
			const body = parseBody(init);
			const newDoc: FrappeDoc = {
				...body,
				name: `${doctype.toUpperCase().replace(/ /g, '-')}-${Math.floor(Math.random() * 100000)}`,
				doctype,
				docstatus: 0,
				owner: 'admin@demo.com',
				modified: new Date().toISOString(),
			} as FrappeDoc;
			// Persist into the in-memory store so subsequent reads return it.
			if (!MOCK_DOCS[doctype]) MOCK_DOCS[doctype] = [];
			MOCK_DOCS[doctype].unshift(newDoc);
			return jsonResponse({ data: newDoc });
		}

		// PUT/PATCH /api/resource/{doctype}/{name}  → update
		if ((method === 'PUT' || method === 'PATCH') && name) {
			const body = parseBody(init);
			const idx = rows.findIndex((r) => r.name === name);
			if (idx < 0) return jsonResponse({ message: 'Not found' }, 404);
			const updated = { ...rows[idx], ...body, modified: new Date().toISOString() } as FrappeDoc;
			rows[idx] = updated;
			return jsonResponse({ data: updated });
		}

		// DELETE /api/resource/{doctype}/{name}
		if (method === 'DELETE' && name) {
			const idx = rows.findIndex((r) => r.name === name);
			if (idx >= 0) rows.splice(idx, 1);
			return jsonResponse({ message: 'ok' });
		}
	}

	// ---------- /printview ----------

	if (url.includes('/printview')) {
		// Return an empty printable HTML so the iframe renders something.
		const q = queryOf(url);
		const doctype = q.get('doctype') ?? 'Document';
		const name = q.get('name') ?? '';
		const html = `<!doctype html><html><body style="font-family: sans-serif; padding: 40px;">
<h1>${doctype}</h1>
<p><strong>Name:</strong> ${name}</p>
<p><em>Mock print preview — no real backend.</em></p>
</body></html>`;
		return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
	}

	return null;
}

// ---------- Workspace fixtures ----------

const WORKSPACE_LIST = [
	{ name: 'Home', label: 'Home', module: 'Setup', icon: 'house', public: 1, sequence_id: 1 },
	{ name: 'Accounting', label: 'Accounting', module: 'Accounts', icon: 'landmark', indicator_color: 'green', public: 1, sequence_id: 2 },
	{ name: 'Selling', label: 'Selling', module: 'Selling', icon: 'store', public: 1, sequence_id: 3 },
	{ name: 'Buying', label: 'Buying', module: 'Buying', icon: 'shopping-cart', public: 1, sequence_id: 4 },
	{ name: 'Stock', label: 'Stock', module: 'Stock', icon: 'package', public: 1, sequence_id: 5 },
	{ name: 'CRM', label: 'CRM', module: 'CRM', icon: 'handshake', public: 1, sequence_id: 6 },
	{ name: 'Projects', label: 'Projects', module: 'Projects', icon: 'folder-kanban', public: 1, sequence_id: 7 },
];

const HOME_WORKSPACE_CONTENT = JSON.stringify([
	{ id: 'hdr', type: 'header', data: { text: '<b>Home</b>', col: 12 } },
	{ id: 'nc1', type: 'number_card', data: { number_card_name: 'open_todos', col: 6 } },
	{ id: 'nc2', type: 'number_card', data: { number_card_name: 'unpaid_invoices', col: 6 } },
	{ id: 'ch1', type: 'chart', data: { chart_name: 'revenue_trend', col: 12 } },
]);

const ACCOUNTING_CONTENT = JSON.stringify([
	{ id: 'hdr', type: 'header', data: { text: '<b>Accounting Overview</b>', col: 12 } },
	{ id: 'nc1', type: 'number_card', data: { number_card_name: 'incoming', col: 3 } },
	{ id: 'nc2', type: 'number_card', data: { number_card_name: 'outgoing', col: 3 } },
	{ id: 'nc3', type: 'number_card', data: { number_card_name: 'paid', col: 3 } },
	{ id: 'nc4', type: 'number_card', data: { number_card_name: 'unpaid', col: 3 } },
	{ id: 'ch1', type: 'chart', data: { chart_name: 'cashflow', col: 12 } },
]);

const WORKSPACES: Record<string, Record<string, unknown>> = {
	Home: {
		name: 'Home', label: 'Home', module: 'Setup', icon: 'house',
		content: HOME_WORKSPACE_CONTENT, links: [], charts: [], number_cards: [], shortcuts: [], sidebar_items: [],
	},
	Accounting: {
		name: 'Accounting', label: 'Accounting', module: 'Accounts', icon: 'landmark',
		content: ACCOUNTING_CONTENT, links: [], charts: [{ chart_name: 'cashflow' }], number_cards: [], shortcuts: [], sidebar_items: [],
	},
	Selling: {
		name: 'Selling', label: 'Selling', module: 'Selling', icon: 'store',
		content: HOME_WORKSPACE_CONTENT, links: [], charts: [], number_cards: [], shortcuts: [], sidebar_items: [],
	},
	Stock: {
		name: 'Stock', label: 'Stock', module: 'Stock', icon: 'package',
		content: HOME_WORKSPACE_CONTENT, links: [], charts: [], number_cards: [], shortcuts: [], sidebar_items: [],
	},
};

// Touch MOCK_METAS so the import isn't tree-shaken away (used by getDocTypeResponse).
void MOCK_METAS;
