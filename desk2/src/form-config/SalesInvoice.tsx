/**
 * Sales Invoice — form-config.
 *
 * Ported from erpnext/accounts/doctype/sales_invoice/sales_invoice.js
 * (SalesInvoiceController.refresh). The original injects ~10 "Create→X"
 * buttons via `frm.add_custom_button`. Each maps to a backend `make_*`
 * method that opens a new related doc (Payment Entry, Delivery Note, etc.).
 *
 * Strategy: declare each button with its `show` condition (based on doc
 * state) and its backend method. The form engine renders the button and,
 * on click, calls `frappe.model.open_mapped_doc({method, frm})` — which
 * is `run_doc_method` with the doc + method, then navigates to the result.
 *
 * Button → backend method mapping (from sales_invoice.py):
 *   Payment             → erpnext.accounts.doctype.sales_invoice.sales_invoice.make_payment_entry
 *   Return / Credit Note→ ...make_sales_return
 *   Delivery Note       → ...make_delivery_note
 *   Payment Request     → ...make_payment_request
 *   Invoice Discounting → ...make_invoice_discounting
 *   Dunning             → ...make_dunning
 *   Maintenance Schedule→ ...make_maintenance_schedule
 */

import { register, type FormConfig } from './registry';
import type { FrappeDoc } from '@/types/frappe';
import type { Form } from './registry';
import { flt } from '@/lib/numbers';

const SI_METHOD_BASE = 'erpnext.accounts.doctype.sales_invoice.sales_invoice';

type CustomButton = NonNullable<FormConfig['customButtons']>[number];

/** A button that opens a mapped doc by calling a backend `make_*` method. */
function makeButton(label: string, method: string, opts?: {
	show?: (doc: FrappeDoc) => boolean;
	variant?: 'primary' | 'default';
}): CustomButton {
	return {
		label,
		group: 'Create',
		variant: opts?.variant ?? 'default',
		show: opts?.show,
		onClick: (form: Form) => {
			// Delegate to backend: run the make_* method on the current doc.
			void form;
			const docname = (form.state.doc as FrappeDoc).name;
			const doctype = form.meta.name;
			// The backend returns `{ doctype, name }` of the new mapped doc.
			void fetch('/api/method/frappe.model.open_mapped_doc', {
				method: 'POST',
				credentials: 'same-origin',
				headers: {
					'Content-Type': 'application/json',
					'X-Frappe-CSRF-Token': window.frappe?.csrf_token ?? '',
				},
				body: JSON.stringify({
					method: `${SI_METHOD_BASE}.${method}`,
					source_name: docname,
					doctype,
				}),
			}).then((r) => r.json()).then((res) => {
				if (res.message?.doctype && res.message?.name) {
					window.location.href = `/desk2/form/${encodeURIComponent(res.message.doctype)}/${encodeURIComponent(res.message.name)}`;
				}
			});
		},
	};
}

const config: FormConfig = {
	customButtons: [
		// Payment — when submitted with outstanding balance.
		makeButton('Payment', 'make_payment_entry', {
			variant: 'primary',
			show: (doc) => doc.docstatus === 1 && flt(doc.outstanding_amount) !== 0,
		}),
		// Return / Credit Note — submitted, not a return, has non-negative outstanding.
		makeButton('Return / Credit Note', 'make_sales_return', {
			show: (doc) => doc.docstatus === 1 && !doc.is_return,
		}),
		// Delivery Note — submitted, update_stock not set, items have undelivered qty.
		makeButton('Delivery Note', 'make_delivery_note', {
			show: (doc) =>
				doc.docstatus === 1 &&
				!doc.is_return &&
				doc.update_stock !== 1 &&
				Array.isArray(doc.items) &&
				doc.items.some((it: FrappeDoc) => Number(it.qty ?? 0) - Number(it.delivered_qty ?? 0) > 0),
		}),
		// Payment Request — submitted with positive outstanding.
		makeButton('Payment Request', 'make_payment_request', {
			show: (doc) => doc.docstatus === 1 && flt(doc.outstanding_amount) > 0,
		}),
		// Invoice Discounting — same condition.
		makeButton('Invoice Discounting', 'make_invoice_discounting', {
			show: (doc) => doc.docstatus === 1 && flt(doc.outstanding_amount) > 0,
		}),
		// Dunning — when payment schedule is overdue.
		makeButton('Dunning', 'make_dunning', {
			show: (doc) => {
				if (doc.docstatus !== 1 || flt(doc.outstanding_amount) <= 0) return false;
				const schedule = doc.payment_schedule as FrappeDoc[] | undefined;
				if (!Array.isArray(schedule) || schedule.length === 0) return false;
				const now = Date.now();
				return schedule.some((row) => {
					const due = Date.parse(String(row.due_date ?? ''));
					return Number.isFinite(due) && due < now;
				});
			},
		}),
		// Maintenance Schedule — always when submitted.
		makeButton('Maintenance Schedule', 'make_maintenance_schedule', {
			show: (doc) => doc.docstatus === 1,
		}),
	],
	makeMethods: [
		{ label: 'Dunning', method: `${SI_METHOD_BASE}.make_dunning` },
		{ label: 'Invoice Discounting', method: `${SI_METHOD_BASE}.make_invoice_discounting` },
	],
};

register('Sales Invoice', config);
