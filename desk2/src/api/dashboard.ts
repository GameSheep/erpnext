/**
 * Dashboard widgets — number cards and dashboard charts.
 *
 * Number cards: `frappe.desk.doctype.number_card.number_card.get_result(card_name, filters)`
 * Dashboard charts: `frappe.desk.dashboard.chart.get(chart_name, filters, from_date, to_date)`
 *
 * Both endpoints are GET-friendly but Frappe's desk POSTs; we use GET for
 * cacheability since the data is read-only aggregates.
 */

import { useFrappeGetCall } from 'frappe-react-sdk';
import type { SWRConfiguration } from 'swr';

export interface NumberCardResult {
	value?: number | string;
	formatted_value?: string;
	label?: string;
	sparkline_data?: Array<{ time: string; value: number }>;
	percentage_change?: number;
	[key: string]: unknown;
}

/** Fetch a number card's value (with optional dynamic filters). */
export function useNumberCard(
	cardName: string | undefined,
	filters?: Record<string, unknown>,
	options?: SWRConfiguration,
) {
	const filtersStr = filters ? JSON.stringify(filters) : '';
	const swrKey = cardName ? ['number_card', cardName, filtersStr] : null;
	return useFrappeGetCall<NumberCardResult>(
		'frappe.desk.doctype.number_card.number_card.get_result',
		{ card_name: cardName, filters: filtersStr },
		swrKey,
		{ revalidateIfStale: false, revalidateOnFocus: false, revalidateOnReconnect: false, ...options },
	);
}

export interface DashboardChartResult {
	labels?: (string | number)[];
	datasets?: Array<{
		name?: string;
		values?: Array<number | null>;
		chartType?: string;
		color?: string;
	}>;
	y_markers?: Array<{ label: string; value: number; options?: string }>;
	y_axis?: unknown;
	x_axis?: unknown;
	chart?: { type?: string };
	[key: string]: unknown;
}

/** Fetch a dashboard chart's data. */
export function useDashboardChart(
	chartName: string | undefined,
	args?: {
		filters?: Record<string, unknown>;
		from_date?: string;
		to_date?: string;
		time_interval?: string;
		timespan?: string;
	},
	options?: SWRConfiguration,
) {
	const argsKey = args ? JSON.stringify(args) : '';
	const swrKey = chartName ? ['dashboard_chart', chartName, argsKey] : null;
	return useFrappeGetCall<DashboardChartResult>(
		'frappe.desk.dashboard.chart.get',
		{ chart_name: chartName, ...(args as Record<string, unknown>) },
		swrKey,
		{ revalidateIfStale: false, revalidateOnFocus: false, revalidateOnReconnect: false, ...options },
	);
}
