/**
 * Misc desk endpoints: listview data (reportview.get), workspace list, tree
 * children, assignments, comments, attachments, notifications.
 *
 * `frappe.desk.reportview.get` is the workhorse for list views — it accepts a
 * doctype, optional fields/filters/order_by/limit_start/limit_length and
 * returns `{ data, values, last, total_count }`.
 */

import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import type { SWRConfiguration } from 'swr';
import { useCallback, useState } from 'react';

import type { Workspace, WorkspaceSidebarItem } from '@/types/frappe';

// ---------- List view (reportview) ----------

export interface ReportViewArgs {
	doctype: string;
	fields?: string[];
	filters?: Array<unknown[] | unknown>;
	order_by?: string;
	limit_start?: number;
	limit_page_length?: number;
	group_by?: string;
	view?: string;
	/** Column-spec for report-builder style views. */
	columns?: string[] | Array<{ label: string; fieldname: string; fieldtype?: string; width?: number }>;
}

export interface ReportViewResponse {
	data: Array<Record<string, unknown>>;
	/** Last page reached. */
	last?: boolean;
	total_count?: number;
	values?: Record<string, unknown>;
	_raw?: unknown;
}

/** Imperative listview fetch (we usually want manual control of pagination). */
export function useReportView() {
	const { call, loading, error, reset } = useFrappePostCall<ReportViewResponse>(
		'frappe.desk.reportview.get',
	);
	const [result, setResult] = useState<ReportViewResponse | null>(null);

	const run = useCallback(
		async (args: ReportViewArgs) => {
			const payload: Record<string, unknown> = {
				doctype: args.doctype,
				fields: args.fields ? JSON.stringify(args.fields) : undefined,
				filters: args.filters ? JSON.stringify(args.filters) : undefined,
				order_by: args.order_by,
				limit_start: args.limit_start ?? 0,
				limit_page_length: args.limit_page_length ?? 20,
				group_by: args.group_by,
				view: args.view,
			};
			const res = await call(payload);
			setResult(res);
			return res;
		},
		[call],
	);

	return { run, result, loading, error, reset, setResult };
}

// ---------- Workspace list ----------

export interface WorkspaceListItem {
	name: string;
	label?: string;
	title?: string;
	module?: string;
	icon?: string;
	indicator_color?: string;
	is_hidden?: 0 | 1;
	public?: 0 | 1;
	for_user?: string;
	sequence_id?: number;
}

export function useWorkspaceList(options?: SWRConfiguration) {
	return useFrappeGetCall<{ message: WorkspaceListItem[] }>(
		'frappe.desk.desktop.get_workspace_sidebar_items',
		{},
		['workspace_list'],
		{ revalidateIfStale: false, revalidateOnFocus: false, revalidateOnReconnect: false, ...options },
	);
}

/** Fetch the full Workspace doc (content JSON, links, charts, shortcuts). */
export function useWorkspace(name: string | undefined, options?: SWRConfiguration) {
	const swrKey = name ? ['workspace', name] : null;
	const r = useFrappeGetCall<{ message: Workspace; docs?: Workspace[] }>(
		'frappe.desk.desktop.get_workspace',
		{ name },
		swrKey,
		{ revalidateIfStale: false, revalidateOnFocus: false, revalidateOnReconnect: false, ...options },
	);
	return { ...r, data: r.data?.message ?? (r.data?.docs?.[0] as Workspace | undefined) };
}

// ---------- Tree view ----------

export interface TreeNode {
	name: string;
	title?: string;
	parent?: string;
	expanded?: boolean;
	is_group?: 0 | 1;
	leaf?: boolean;
	[key: string]: unknown;
}

export function useTreeChildren(
	serverMethod: string | undefined,
	parent: string | undefined,
	doctype: string | undefined,
	options?: SWRConfiguration,
) {
	const swrKey = serverMethod && parent && doctype ? ['tree_children', serverMethod, doctype, parent] : null;
	return useFrappeGetCall<{ message: TreeNode[] }>(
		serverMethod ?? 'frappe.desk.treeview.get_children',
		{ doctype, parent },
		swrKey,
		{ revalidateIfStale: false, revalidateOnFocus: false, revalidateOnReconnect: false, ...options },
	);
}

// ---------- Notifications ----------

export interface NotificationCounts {
	openid?: number;
	targets?: Array<{ name: string; target: number; value: number; docstatus?: number }>;
	open_count_doctype?: Record<string, number>;
	open_count_other?: Record<string, number>;
	notifications_for_doctype?: Record<string, unknown>;
	summary?: unknown;
	[url: string]: unknown;
}

export function useNotificationCounts(options?: SWRConfiguration) {
	return useFrappeGetCall<NotificationCounts>(
		'frappe.desk.doctype.notification_log.notification_log.get_notifications',
		{},
		['notification_counts'],
		{ revalidateIfStale: false, revalidateOnFocus: true, revalidateOnReconnect: true, ...options },
	);
}

// ---------- Sidebar items (typed helper) ----------

export type { Workspace, WorkspaceSidebarItem };
