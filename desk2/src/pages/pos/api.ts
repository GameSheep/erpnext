/**
 * POS API layer — typed wrappers over the Frappe POS backend.
 *
 * Mirrors the whitelisted methods in
 * erpnext/selling/page/point_of_sale/point_of_sale.py. Each function is an
 * imperative hook so the POS page can call them at will (not on mount).
 */

import { useCallback } from 'react';
import { FrappeContext, type FrappeConfig } from 'frappe-react-sdk';
import { useContext } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';

const POS_BASE = 'erpnext.selling.page.point_of_sale.point_of_sale';

// ---------- Types ----------

export interface POSProfile {
	name: string;
	company: string;
	customer?: string;
	warehouse?: string;
	currency?: string;
	price_list?: string;
	write_off_account?: string;
	write_off_cost_center?: string;
	[pos_key: string]: unknown;
}

export interface POSItem {
	name: string;
	item_code: string;
	item_name: string;
	item_group: string;
	description?: string;
	image?: string;
	barcode?: string;
	rate: number;
	price_list_rate: number;
	stock_uom: string;
	actual_qty?: number;
	in_stock?: boolean;
	has_batch_no?: 0 | 1;
	has_serial_no?: 0 | 1;
	apply_discount?: 0 | 1;
	is_stock_item?: 0 | 1;
	[pos_key: string]: unknown;
}

export interface POSInvoiceItem {
	item_code: string;
	item_name: string;
	qty: number;
	rate: number;
	amount: number;
	discount_percentage?: number;
	discount_amount?: number;
	uom?: string;
	warehouse?: string;
	serial_no?: string;
	batch_no?: string;
	[pos_key: string]: unknown;
}

export interface POSInvoice {
	doctype: 'POS Invoice';
	name?: string;
	customer: string;
	company: string;
	pos_profile: string;
	posting_date: string;
	currency?: string;
	items: POSInvoiceItem[];
	taxes_and_charges?: string;
	additional_discount_percentage?: number;
	discount_amount?: number;
	[key: string]: unknown;
}

export interface PaymentMode {
	mode_of_payment: string;
	amount: number;
	[key: string]: unknown;
}

export interface PastOrder {
	name: string;
	customer: string;
	grand_total: number;
	status: string;
	posting_date: string;
	[pos_key: string]: unknown;
}

export interface OpeningEntry {
	name: string;
	pos_profile: string;
	company: string;
	balance_details: Array<{ mode_of_payment: string; amount: number }>;
}

// ---------- Imperative API (for actions) ----------

export function usePOSApi() {
	const ctx = useContext(FrappeContext) as FrappeConfig | null;
	const call = ctx?.call;

	const checkOpeningEntry = useCallback(
		async (user: string): Promise<{ opening_entry?: string; pos_profile?: string; pos_opening_shift?: string }> => {
			const res = await call?.get(`${POS_BASE}.check_opening_entry`, { user });
			return res?.message as { opening_entry?: string; pos_profile?: string };
		},
		[call],
	);

	const createOpeningVoucher = useCallback(
		async (profile: string, company: string, balanceDetails: Array<{ mode_of_payment: string; amount: number }>) => {
			const res = await call?.post(`${POS_BASE}.create_opening_voucher`, {
				pos_profile: profile,
				company,
				balance_details: JSON.stringify(balanceDetails),
			});
			return res?.message as { name: string };
		},
		[call],
	);

	const getPOSProfileData = useCallback(
		async (profileName: string) => {
			const res = await call?.get(`${POS_BASE}.get_pos_profile_data`, { pos_profile: profileName });
			return res?.message as POSProfile & {
				items?: POSItem[];
				customer_groups?: unknown[];
				companies?: unknown[];
			};
		},
		[call],
	);

	const submitInvoice = useCallback(
		async (invoice: POSInvoice) => {
			const res = await call?.post(`${POS_BASE}.submit_invoice`, { data: JSON.stringify(invoice) });
			return res?.message as { name: string; grand_total: number };
		},
		[call],
	);

	const setCustomer = useCallback(
		async (invoiceName: string, customer: string) => {
			const res = await call?.post(`${POS_BASE}.set_customer`, { invoice: invoiceName, customer });
			return res?.message;
		},
		[call],
	);

	return { checkOpeningEntry, createOpeningVoucher, getPOSProfileData, submitInvoice, setCustomer };
}

// ---------- Reactive hooks (for queries) ----------

export function usePOSItems(start = 0, pageLength = 40, search = '', itemGroup?: string) {
	return useFrappeGetCall<{ message: POSItem[] }>(
		`${POS_BASE}.get_items`,
		{ start, page_length: pageLength, search, pos_profile: '', item_group: itemGroup },
		['pos_items', String(start), String(pageLength), search, itemGroup ?? ''],
		{ revalidateIfStale: false, revalidateOnFocus: false, keepPreviousData: true },
	);
}

export function usePOSPastOrders(search = '', status = '', limit = 20) {
	return useFrappeGetCall<{ message: PastOrder[] }>(
		`${POS_BASE}.get_past_order_list`,
		{ search_term: search, status, limit },
		['pos_past_orders', search, status, String(limit)],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);
}
