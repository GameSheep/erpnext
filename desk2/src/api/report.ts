/**
 * Report execution — wraps `frappe.desk.query_report.run` (POST) and
 * `frappe.desk.query_report.get` (GET) for metadata.
 *
 * The run endpoint returns:
 *   {
 *     result: T[],              // rows
 *     columns: ColumnDef[],     // {label, fieldtype, fieldname, width, options}
 *     report_summary: Summary[] // optional footer totals
 *     chart: {...}              // optional chart data
 *     add_total_row: boolean,
 *     prepared_report: boolean,
 *   }
 */

import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import type { SWRConfiguration } from 'swr';
import { useCallback, useState } from 'react';

import type { FieldType } from '@/types/frappe';

export interface ReportColumn {
	label: string;
	fieldname: string;
	fieldtype?: FieldType;
	width?: number | string;
	options?: string;
}

export interface ReportSummaryItem {
	label?: string;
	value?: unknown;
	color?: string;
	datatype?: FieldType;
	plot?: unknown;
	is_tree?: boolean;
	// Frappe uses `Report Summary` shaped objects with index access.
	[key: string]: unknown;
}

export interface ReportChart {
	type?: string;
	data?: { labels?: unknown[]; datasets?: Array<{ name?: string; values?: unknown[] }> };
	[key: string]: unknown;
}

export interface QueryReportResponse<T = Record<string, unknown>> {
	result: T[];
	columns: ReportColumn[];
	report_summary?: ReportSummaryItem[];
	chart?: ReportChart;
	add_total_row?: boolean;
	prepared_report?: boolean;
	doc?: { queued_at?: string; report_end_time?: string };
	message?: string;
}

export interface ReportFilterDef {
	fieldname: string;
	label?: string;
	fieldtype: FieldType;
	options?: string;
	default?: unknown;
	reqd?: 0 | 1;
	width?: string | number;
	depends_on?: string;
	on_change?: () => void;
	get_data?: (txt: string) => Promise<unknown>;
	ignore_user_permissions?: boolean;
}

interface ReportMetadataResponse {
	report?: {
		name: string;
		ref_doctype?: string;
		report_type?: string;
		add_total_row?: 0 | 1;
		columns?: unknown;
		filter_options?: unknown;
	};
	filters?: ReportFilterDef[];
	[key: string]: unknown;
}

/** Fetch report metadata + filters (cheap, cacheable). */
export function useReportMeta(reportName: string | undefined, options?: SWRConfiguration) {
	const swrKey = reportName ? ['report_meta', reportName] : null;
	return useFrappeGetCall<ReportMetadataResponse>(
		'frappe.desk.query_report.get',
		{ report_name: reportName },
		swrKey,
		{ revalidateIfStale: false, revalidateOnFocus: false, revalidateOnReconnect: false, ...options },
	);
}

/**
 * Imperative report run hook. Returns a `run` function + loading/error state.
 * We use POST (Frappe accepts both, but POST is what the desk uses).
 *
 * NOTE: filters must be JSON-stringified for the Frappe endpoint.
 */
export function useReportRun<T = Record<string, unknown>>() {
	const { call, loading, error, reset } = useFrappePostCall<QueryReportResponse<T>>(
		'frappe.desk.query_report.run',
	);
	const [result, setResult] = useState<QueryReportResponse<T> | null>(null);

	const run = useCallback(
		async (reportName: string, filters: Record<string, unknown>, args?: {
			ignore_prepared_report?: boolean;
			are_default_values?: boolean;
		}) => {
			const payload = {
				report_name: reportName,
				filters: JSON.stringify(filters),
				...args,
			} as Record<string, unknown>;
			const res = await call(payload);
			setResult(res);
			return res;
		},
		[call],
	);

	return { run, result, loading, error, reset, setResult };
}
