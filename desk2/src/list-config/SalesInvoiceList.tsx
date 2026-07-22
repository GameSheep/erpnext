/**
 * Sales Invoice — list-config.
 *
 * Ported from erpnext/accounts/doctype/sales_invoice/sales_invoice_list.js.
 * Declares: extra fields to fetch, status indicator colors, right-aligned
 * total column, and bulk-action items (Delivery Note / Payment Entry).
 *
 * The bulk actions call the backend `erpnext.bulk_transaction_processing`
 * endpoint — we keep that server-side logic intact and just POST to it.
 */

import { register, type Indicator } from './registry';
import { flt } from '@/lib/numbers';
import { formatCurrency } from '@/lib/currency';
import type { FrappeDoc } from '@/types/frappe';

const STATUS_COLORS: Record<string, string> = {
	Draft: 'red',
	Unpaid: 'orange',
	Paid: 'green',
	Return: 'gray',
	'Credit Note Issued': 'gray',
	'Unpaid and Discounted': 'orange',
	'Partly Paid and Discounted': 'yellow',
	'Overdue and Discounted': 'red',
	Overdue: 'red',
	'Partly Paid': 'yellow',
	'Internal Transfer': 'darkgrey',
};

register('Sales Invoice', {
	addFields: [
		'customer',
		'customer_name',
		'base_grand_total',
		'outstanding_amount',
		'due_date',
		'company',
		'currency',
		'is_return',
	],
	rightColumn: 'grand_total',
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const status = doc.status as string | undefined;
		if (!status) return undefined;
		// Special case: Credit Note Issued with zero outstanding → "Settled".
		if (status === 'Credit Note Issued' && flt(doc.outstanding_amount) === 0) {
			return ['Settled with Credit Note', 'green', 'status,=,Credit Note Issued|outstanding_amount,=,0'];
		}
		return [status, STATUS_COLORS[status] ?? 'gray', `status,=,${status}`];
	},
	formatters: {
		// Show base_grand_total with currency formatting.
		base_grand_total: (value) => formatCurrency(Number(value)),
		outstanding_amount: (value) => {
			const n = Number(value);
			if (n === 0) return <span style={{ color: '#52c41a' }}>Settled</span>;
			return formatCurrency(n);
		},
	},
	bulkActions: [
		{
			label: 'Create Delivery Note',
			method: 'erpnext.bulk_transaction_processing.create',
		},
		{
			label: 'Create Payment Entry',
			method: 'erpnext.bulk_transaction_processing.create',
		},
	],
});
