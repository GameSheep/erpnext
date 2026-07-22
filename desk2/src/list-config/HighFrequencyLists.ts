/**
 * Batch list-config for high-frequency ERPNext doctypes.
 * Each registers default filters + status indicators so the generic List view
 * shows them correctly without needing the original *_list.js.
 */

import { register, type Indicator } from './registry';
import type { FrappeDoc } from '@/types/frappe';
import { flt } from '@/lib/numbers';

// ---------- Purchase Invoice ----------
register('Purchase Invoice', {
	addFields: ['supplier', 'supplier_name', 'base_grand_total', 'outstanding_amount', 'due_date', 'status'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		const map: Record<string, string> = { Draft: 'red', Unpaid: 'orange', Paid: 'green', Return: 'gray', Overdue: 'red', 'Partly Paid': 'yellow' };
		return s ? [s, map[s] ?? 'gray', `status,=,${s}`] : undefined;
	},
	formatters: { base_grand_total: (v) => Number(v).toFixed(2) },
});

// ---------- Sales Order ----------
register('Sales Order', {
	addFields: ['customer', 'customer_name', 'base_grand_total', 'delivery_status', 'billing_status', 'status'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		const map: Record<string, string> = { Draft: 'red', 'To Deliver and Bill': 'orange', 'To Bill': 'orange', 'To Deliver': 'orange', Completed: 'green', 'On Hold': 'gray', Closed: 'gray', Cancelled: 'red' };
		return s ? [s, map[s] ?? 'gray', `status,=,${s}`] : undefined;
	},
});

// ---------- Purchase Order ----------
register('Purchase Order', {
	addFields: ['supplier', 'supplier_name', 'base_grand_total', 'status'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		const map: Record<string, string> = { Draft: 'red', 'To Receive and Bill': 'orange', 'To Bill': 'orange', 'To Receive': 'orange', Completed: 'green', Closed: 'gray', Cancelled: 'red' };
		return s ? [s, map[s] ?? 'gray', `status,=,${s}`] : undefined;
	},
});

// ---------- Quotation ----------
register('Quotation', {
	addFields: ['customer_name', 'base_grand_total', 'status', 'valid_till'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		const map: Record<string, string> = { Draft: 'red', Open: 'blue', Replied: 'blue', 'Partly Ordered': 'orange', Ordered: 'green', Lost: 'gray', Cancelled: 'red' };
		return s ? [s, map[s] ?? 'gray', `status,=,${s}`] : undefined;
	},
});

// ---------- Lead ----------
register('Lead', {
	addFields: ['lead_name', 'company_name', 'status', 'source', 'email_id'],
	filters: [['Lead', 'status', '!=', 'Do Not Contact']],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		const map: Record<string, string> = { Lead: 'blue', Open: 'blue', Replied: 'blue', Opportunity: 'green', Interested: 'green', 'Do Not Contact': 'red', Converted: 'green' };
		return s ? [s, map[s] ?? 'gray', `status,=,${s}`] : undefined;
	},
});

// ---------- Opportunity ----------
register('Opportunity', {
	addFields: ['customer_name', 'opportunity_amount', 'status', 'sales_stage'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		return s ? [s, s === 'Open' ? 'blue' : s === 'Converted' ? 'green' : 'gray', `status,=,${s}`] : undefined;
	},
});

// ---------- Project ----------
register('Project', {
	addFields: ['project_name', 'customer', 'status', 'percent_complete', 'project_type'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		const map: Record<string, string> = { Open: 'green', Completed: 'blue', Cancelled: 'red', Hold: 'gray' };
		return s ? [s, map[s] ?? 'gray', `status,=,${s}`] : undefined;
	},
});

// ---------- Task ----------
register('Task', {
	addFields: ['subject', 'project', 'status', 'priority', 'exp_end_date', 'progress'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		const map: Record<string, string> = { Open: 'blue', Working: 'orange', 'Pending Review': 'purple', Overdue: 'red', Completed: 'green', Cancelled: 'gray', Template: 'gray' };
		return s ? [s, map[s] ?? 'gray', `status,=,${s}`] : undefined;
	},
});

// ---------- Employee ----------
register('Employee', {
	addFields: ['employee_name', 'department', 'designation', 'status', 'gender'],
	filters: [['Employee', 'status', '=', 'Active']],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		return s ? [s, s === 'Active' ? 'green' : s === 'Left' ? 'red' : 'gray', `status,=,${s}`] : undefined;
	},
});

// ---------- Item Group (tree-ish) ----------
register('Item Group', {
	addFields: ['parent_item_group', 'is_group'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		return doc.is_group ? ['Group', 'purple', 'is_group,=,1'] : ['Leaf', 'blue', 'is_group,=,0'];
	},
});

// ---------- Payment Entry ----------
register('Payment Entry', {
	addFields: ['party', 'party_name', 'payment_type', 'paid_amount', 'status'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		return s ? [s, s === 'Submitted' ? 'green' : s === 'Cancelled' ? 'red' : 'gray', `status,=,${s}`] : undefined;
	},
	formatters: { paid_amount: (v) => flt(Number(v)).toFixed(2) },
});

// ---------- Stock Entry ----------
register('Stock Entry', {
	addFields: ['stock_entry_type', 'purpose', 'total_outgoing_value', 'total_incoming_value', 'status'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		return s ? [s, s === 'Submitted' ? 'green' : s === 'Cancelled' ? 'red' : 'gray', `status,=,${s}`] : undefined;
	},
});

// ---------- Journal Entry ----------
register('Journal Entry', {
	addFields: ['voucher_type', 'total_debit', 'total_credit', 'status'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		return s ? [s, s === 'Submitted' ? 'green' : s === 'Cancelled' ? 'red' : 'gray', `status,=,${s}`] : undefined;
	},
});

// ---------- Material Request ----------
register('Material Request', {
	addFields: ['customer', 'supplier', 'total_qty', 'status', 'per_ordered'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		const map: Record<string, string> = { Draft: 'red', Submitted: 'blue', Stopped: 'gray', Cancelled: 'red', Transferred: 'green', Received: 'green' };
		return s ? [s, map[s] ?? 'gray', `status,=,${s}`] : undefined;
	},
});

// ---------- Delivery Note ----------
register('Delivery Note', {
	addFields: ['customer', 'customer_name', 'base_grand_total', 'status'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		return s ? [s, s === 'Submitted' ? 'green' : s === 'Cancelled' ? 'red' : 'gray', `status,=,${s}`] : undefined;
	},
});

// ---------- Purchase Receipt ----------
register('Purchase Receipt', {
	addFields: ['supplier', 'supplier_name', 'base_grand_total', 'status'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const s = doc.status as string;
		return s ? [s, s === 'Submitted' ? 'green' : s === 'Cancelled' ? 'red' : 'gray', `status,=,${s}`] : undefined;
	},
});

// ---------- Account ----------
register('Account', {
	addFields: ['account_name', 'parent_account', 'is_group', 'account_type', 'root_type'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		return doc.is_group ? ['Group', 'purple', 'is_group,=,1'] : ['Ledger', 'blue', 'is_group,=,0'];
	},
});

// ---------- Warehouse ----------
register('Warehouse', {
	addFields: ['warehouse_name', 'parent_warehouse', 'is_group'],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		return doc.is_group ? ['Group', 'purple', 'is_group,=,1'] : ['Leaf', 'blue', 'is_group,=,0'];
	},
});
