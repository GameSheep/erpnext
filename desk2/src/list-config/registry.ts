/**
 * list-config registry — per-doctype declarations that replace Frappe's
 * `frappe.listview_settings["<Doctype>"]` blocks.
 *
 * Each doctype that needs custom list behaviour (custom indicators, default
 * filters, custom cell formatters, bulk-action items) gets a config here.
 * Plain TS for type-safety + tree-shaking.
 */

import type { DocField, FrappeDoc } from '@/types/frappe';

/** Frappe's indicator tuple: [label, color, filter_spec?]. */
export type Indicator = [string, string?, string?];

export interface ListConfig {
	/** Extra fields to fetch alongside the visible columns. */
	addFields?: string[];
	/** Default filters applied on view load. */
	filters?: Array<unknown[]>;
	/** Custom cell formatter per fieldname. */
	formatters?: Record<string, (value: unknown, df: DocField, doc: FrappeDoc) => React.ReactNode>;
	/** Status pill indicator per row (Frappe's get_indicator). */
	getIndicator?: (doc: FrappeDoc) => Indicator | null | undefined;
	/** Column pinned to the right edge. */
	rightColumn?: string;
	/** Per-column widths. */
	colWidths?: Record<string, number>;
	/** Reports to surface in the toolbar (Frappe's listview.reports). */
	reports?: Array<{ name: string; label?: string; route?: string }>;
	/** Bulk-action items shown when rows are selected. */
	bulkActions?: Array<{
		label: string;
		/** Backend method that takes a list of doc names. */
		method?: string;
		onClick?: (selected: FrappeDoc[]) => void | Promise<void>;
	}>;
}

const registry = new Map<string, ListConfig>();

export function register(doctype: string, config: ListConfig): void {
	registry.set(doctype, config);
}

export function getListConfig(doctype: string): ListConfig | undefined {
	return registry.get(doctype);
}
