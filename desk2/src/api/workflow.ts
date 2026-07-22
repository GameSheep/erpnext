/**
 * Workflow — wraps `frappe.model.workflow.get_transitions` and `apply_workflow`.
 *
 * Workflows are configured at runtime (stored in the Workflow doctype, not in
 * the repo). The form engine fetches available transitions for the current doc
 * and renders them as action buttons; clicking one POSTs to apply_workflow.
 */

import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import type { SWRConfiguration } from 'swr';
import { useCallback, useState } from 'react';

export interface WorkflowTransition {
	state?: string;
	action: string;
	next_state?: string;
	condition?: string;
	allow_self_approval?: 0 | 1;
	update_field?: string;
	update_value?: string;
	allowed?: string;
	icon?: string;
	color?: string;
}

/** Read available transitions for a doc. */
export function useWorkflowTransitions(
	doctype: string | undefined,
	docname: string | undefined,
	docstatus?: number,
	options?: SWRConfiguration,
) {
	const swrKey = doctype && docname ? ['workflow_transitions', doctype, docname, docstatus ?? 0] : null;
	return useFrappeGetCall<{ message: WorkflowTransition[] }>(
		'frappe.model.workflow.get_transitions',
		{ doctype, doc: docname },
		swrKey,
		{ revalidateIfStale: false, revalidateOnFocus: false, revalidateOnReconnect: false, ...options },
	);
}

/** Imperative apply-transition hook. */
export function useApplyWorkflow<T = Record<string, unknown>>() {
	const { call, loading, error, reset } = useFrappePostCall<{ message: T; workflow_action?: string }>(
		'frappe.model.workflow.apply_workflow',
	);
	const [result, setResult] = useState<{ message: T; workflow_action?: string } | null>(null);

	const apply = useCallback(
		async (doctype: string, docname: string, action: string) => {
			const res = await call({ doctype, docname, action });
			setResult(res);
			return res;
		},
		[call],
	);

	return { apply, result, loading, error, reset };
}
