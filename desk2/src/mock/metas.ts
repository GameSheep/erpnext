/**
 * Mock DocType metadata — enough to exercise the FormLayout, FieldRenderer,
 * ChildTable, and the List view across a representative set of fieldtypes.
 *
 * We synthesize four doctypes: ToDo (simple), Customer (medium), Item
 * (tree-ish, with image), and Sales Invoice (submittable + child table).
 *
 * Shape matches `frappe.desk.form.load.getdoctype` response: `{ docs: [...] }`
 * where docs[0] is the requested doctype meta and the rest are child metas.
 */

import type { DocMeta, DocField } from '@/types/frappe';

function f(df: Partial<DocField> & { fieldname: string; fieldtype: DocField['fieldtype'] }): DocField {
	return { label: titleCase(df.fieldname), ...df } as DocField;
}

function titleCase(s: string): string {
	return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------- ToDo ----------

const TODO_META: DocMeta = {
	name: 'ToDo',
	doctype: 'DocType',
	module: 'Core',
	istable: 0,
	is_submittable: 0,
	track_changes: 1,
	allow_rename: 1,
	title_field: 'description',
	fields: [
		f({ fieldname: 'status', fieldtype: 'Select', options: 'Open\nClosed\nCancelled', default: 'Open', in_list_view: 1, in_standard_filter: 1, reqd: 1 }),
		f({ fieldname: 'priority', fieldtype: 'Select', options: 'High\nMedium\nLow', default: 'Medium', in_list_view: 1, in_standard_filter: 1 }),
		f({ fieldname: 'description', fieldtype: 'Text Editor', in_list_view: 1, reqd: 1 }),
		f({ fieldname: 'date_section', fieldtype: 'Section Break', label: 'Dates & Assignment' }),
		f({ fieldname: 'date', fieldtype: 'Date', in_list_view: 1 }),
		f({ fieldname: 'allocated_to', fieldtype: 'Link', options: 'User', in_list_view: 1 }),
		f({ fieldname: 'reference_type', fieldtype: 'Select', options: '\nCustomer\nSales Order\nProject' }),
		f({ fieldname: 'reference_name', fieldtype: 'Dynamic Link', options: 'reference_type', read_only: 1 }),
	],
	permissions: [{ role: 'Administrator', read: 1, write: 1, create: 1, delete: 1, report: 1, email: 1, print: 1, share: 1, export: 1, import: 1, permlevel: 0 }],
};

// ---------- Customer ----------

const CUSTOMER_META: DocMeta = {
	name: 'Customer',
	doctype: 'DocType',
	module: 'Selling',
	istable: 0,
	is_submittable: 0,
	track_changes: 1,
	allow_rename: 1,
	image_field: 'image',
	title_field: 'customer_name',
	search_fields: 'customer_name,customer_group,territory',
	fields: [
		f({ fieldname: 'customer_details', fieldtype: 'Tab Break', label: 'Customer Details' }),
		f({ fieldname: 'customer_name', fieldtype: 'Data', reqd: 1, in_list_view: 1, bold: 1, set_only_once: 1 }),
		f({ fieldname: 'customer_group', fieldtype: 'Link', options: 'Customer Group', in_list_view: 1, in_standard_filter: 1 }),
		f({ fieldname: 'territory', fieldtype: 'Link', options: 'Territory' }),
		f({ fieldname: 'customer_type', fieldtype: 'Select', options: 'Individual\nCompany', default: 'Company', in_standard_filter: 1 }),
		f({ fieldname: 'disabled', fieldtype: 'Check', default: 0, in_standard_filter: 1 }),
		f({ fieldname: 'image', fieldtype: 'Attach Image' }),
		f({ fieldname: 'contact_section', fieldtype: 'Section Break', label: 'Contact' }),
		f({ fieldname: 'email_id', fieldtype: 'Data', options: 'Email' }),
		f({ fieldname: 'mobile_no', fieldtype: 'Data', options: 'Phone' }),
		f({ fieldname: 'website', fieldtype: 'Data', options: 'URL' }),
		f({ fieldname: 'address_section', fieldtype: 'Section Break', label: 'Address', collapsible: 1 }),
		f({ fieldname: 'primary_address', fieldtype: 'Small Text', read_only: 1 }),
		f({ fieldname: 'default_currency', fieldtype: 'Link', options: 'Currency', default: 'CNY' }),
		f({ fieldname: 'default_price_list', fieldtype: 'Link', options: 'Price List' }),
		f({ fieldname: 'stats_section', fieldtype: 'Section Break', label: 'Statistics', collapsible: 1, hide_border: 0 }),
		f({ fieldname: 'total_lifetime_value', fieldtype: 'Currency', read_only: 1 }),
	],
	permissions: [{ role: 'Administrator', read: 1, write: 1, create: 1, delete: 1, report: 1, email: 1, print: 1, share: 1, export: 1, import: 1, permlevel: 0 }],
};

// ---------- Item ----------

const ITEM_META: DocMeta = {
	name: 'Item',
	doctype: 'DocType',
	module: 'Stock',
	istable: 0,
	is_submittable: 0,
	track_changes: 1,
	allow_rename: 1,
	image_field: 'image',
	title_field: 'item_name',
	search_fields: 'item_name,item_group,stock_uom',
	fields: [
		f({ fieldname: 'details', fieldtype: 'Tab Break', label: 'Item Details' }),
		f({ fieldname: 'item_code', fieldtype: 'Data', reqd: 1, in_list_view: 1, bold: 1, set_only_once: 1 }),
		f({ fieldname: 'item_name', fieldtype: 'Data', reqd: 1, in_list_view: 1 }),
		f({ fieldname: 'item_group', fieldtype: 'Link', options: 'Item Group', in_list_view: 1, in_standard_filter: 1, reqd: 1 }),
		f({ fieldname: 'stock_uom', fieldtype: 'Link', options: 'UOM', reqd: 1, default: 'Nos', in_list_view: 1 }),
		f({ fieldname: 'image', fieldtype: 'Attach Image' }),
		f({ fieldname: 'disabled', fieldtype: 'Check', default: 0, in_standard_filter: 1 }),
		f({ fieldname: 'flags_section', fieldtype: 'Section Break', label: 'Flags' }),
		f({ fieldname: 'is_stock_item', fieldtype: 'Check', default: 1 }),
		f({ fieldname: 'has_batch_no', fieldtype: 'Check', default: 0 }),
		f({ fieldname: 'has_serial_no', fieldtype: 'Check', default: 0 }),
		f({ fieldname: 'purchase_section', fieldtype: 'Section Break', label: 'Purchase Details', collapsible: 1 }),
		f({ fieldname: 'standard_rate', fieldtype: 'Currency' }),
		f({ fieldname: 'is_purchase_item', fieldtype: 'Check', default: 1 }),
		f({ fieldname: 'sales_section', fieldtype: 'Section Break', label: 'Sales Details', collapsible: 1 }),
		f({ fieldname: 'is_sales_item', fieldtype: 'Check', default: 1 }),
		f({ fieldname: 'description', fieldtype: 'Text Editor' }),
	],
	permissions: [{ role: 'Administrator', read: 1, write: 1, create: 1, delete: 1, report: 1, email: 1, print: 1, share: 1, export: 1, import: 1, permlevel: 0 }],
};

// ---------- Sales Invoice (submittable, with child table) ----------

const SALES_INVOICE_ITEM_META: DocMeta = {
	name: 'Sales Invoice Item',
	doctype: 'DocType',
	module: 'Accounts',
	istable: 1,
	editable_grid: 1,
	fields: [
		f({ fieldname: 'item_code', fieldtype: 'Link', options: 'Item', in_list_view: 1, columns: 2, reqd: 1 }),
		f({ fieldname: 'item_name', fieldtype: 'Data', in_list_view: 1, columns: 3, read_only: 1 }),
		f({ fieldname: 'qty', fieldtype: 'Float', in_list_view: 1, columns: 1, reqd: 1, default: 1 }),
		f({ fieldname: 'rate', fieldtype: 'Currency', in_list_view: 1, columns: 2, reqd: 1 }),
		f({ fieldname: 'amount', fieldtype: 'Currency', in_list_view: 1, columns: 2, read_only: 1 }),
	],
	permissions: [{ role: 'Administrator', read: 1, write: 1, create: 1, delete: 1, permlevel: 0 }],
};

const SALES_INVOICE_META: DocMeta = {
	name: 'Sales Invoice',
	doctype: 'DocType',
	module: 'Accounts',
	istable: 0,
	is_submittable: 1,
	track_changes: 1,
	allow_rename: 0,
	title_field: 'customer',
	search_fields: 'customer,customer_name,base_grand_total,outstanding_amount',
	fields: [
		f({ fieldname: 'customer_section', fieldtype: 'Section Break', label: 'Customer & Dates' }),
		f({ fieldname: 'customer', fieldtype: 'Link', options: 'Customer', reqd: 1, in_list_view: 1, bold: 1 }),
		f({ fieldname: 'customer_name', fieldtype: 'Data', read_only: 1, in_list_view: 1 }),
		f({ fieldname: 'posting_date', fieldtype: 'Date', default: 'today', in_list_view: 1 }),
		f({ fieldname: 'due_date', fieldtype: 'Date', in_list_view: 1 }),
		f({ fieldname: 'column_break_1', fieldtype: 'Column Break' }),
		f({ fieldname: 'naming_series', fieldtype: 'Select', options: 'ACC-SINV-.YYYY.-', default: 'ACC-SINV-.YYYY.-', read_only: 1 }),
		f({ fieldname: 'company', fieldtype: 'Link', options: 'Company', default: 'Demo Company' }),
		f({ fieldname: 'is_pos', fieldtype: 'Check', default: 0 }),
		f({ fieldname: 'is_return', fieldtype: 'Check', default: 0, read_only: 1 }),
		f({ fieldname: 'currency_section', fieldtype: 'Section Break', label: 'Currency & Price List' }),
		f({ fieldname: 'currency', fieldtype: 'Link', options: 'Currency', default: 'CNY' }),
		f({ fieldname: 'selling_price_list', fieldtype: 'Link', options: 'Price List' }),
		f({ fieldname: 'items_section', fieldtype: 'Section Break', label: 'Items' }),
		f({ fieldname: 'items', fieldtype: 'Table', options: 'Sales Invoice Item', reqd: 1 }),
		f({ fieldname: 'totals_section', fieldtype: 'Section Break', label: 'Totals', collapsible: 1 }),
		f({ fieldname: 'base_total', fieldtype: 'Currency', read_only: 1 }),
		f({ fieldname: 'base_grand_total', fieldtype: 'Currency', read_only: 1, bold: 1 }),
		f({ fieldname: 'outstanding_amount', fieldtype: 'Currency', read_only: 1 }),
		f({ fieldname: 'status', fieldtype: 'Select', options: 'Draft\nUnpaid\nPaid\nOverdue\nReturn', read_only: 1, in_standard_filter: 1 }),
	],
	permissions: [{ role: 'Administrator', read: 1, write: 1, create: 1, delete: 1, submit: 1, cancel: 1, amend: 1, report: 1, email: 1, print: 1, share: 1, export: 1, import: 1, permlevel: 0 }],
};

// ---------- Account (tree doctype) ----------

const ACCOUNT_META: DocMeta = {
	name: 'Account',
	doctype: 'DocType',
	module: 'Accounts',
	istable: 0,
	is_tree: 1,
	nsm_parent_field: 'parent_account',
	default_view: 'Tree',
	title_field: 'account_name',
	fields: [
		f({ fieldname: 'account_name', fieldtype: 'Data', reqd: 1 }),
		f({ fieldname: 'parent_account', fieldtype: 'Link', options: 'Account' }),
		f({ fieldname: 'is_group', fieldtype: 'Check', default: 0 }),
		f({ fieldname: 'account_type', fieldtype: 'Select', options: '\nCash\nBank\nReceivable\nPayable\nEquity\nAsset\nLiability\nIncome\nExpense' }),
		f({ fieldname: 'root_type', fieldtype: 'Select', options: 'Asset\nLiability\nIncome\nEquity\nExpense' }),
		f({ fieldname: 'balance', fieldtype: 'Currency', read_only: 1 }),
	],
	permissions: [{ role: 'Administrator', read: 1, write: 1, create: 1, delete: 1, permlevel: 0 }],
};

export const MOCK_METAS: Record<string, DocMeta> = {
	ToDo: TODO_META,
	Customer: CUSTOMER_META,
	Item: ITEM_META,
	'Sales Invoice': SALES_INVOICE_META,
	'Sales Invoice Item': SALES_INVOICE_ITEM_META,
	Account: ACCOUNT_META,
};

/** Getdoctype response shape (docs array). */
export function getDocTypeResponse(doctype: string): { docs: DocMeta[] } | undefined {
	const meta = MOCK_METAS[doctype];
	if (!meta) return undefined;
	// Always include the child metas referenced by Table fields.
	const docs: DocMeta[] = [meta];
	for (const df of meta.fields) {
		if (df.fieldtype === 'Table' || df.fieldtype === 'Table MultiSelect') {
			const child = MOCK_METAS[df.options as string];
			if (child && !docs.some((d) => d.name === child.name)) docs.push(child);
		}
	}
	return { docs };
}
