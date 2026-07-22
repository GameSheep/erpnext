/**
 * Link-field search — wraps `frappe.desk.search.search_link`, the canonical
 * endpoint Frappe's own Link control uses. Returns `{ value, label, description }`
 * triples plus the raw row so we can show the title field.
 */

import { useFrappeGetCall } from 'frappe-react-sdk';
import { useMemo } from 'react';

export interface LinkSearchResult {
	value: string;
	label: string;
	description: string;
	/** Raw row for advanced display (optional). */
	row?: Record<string, unknown>;
}

interface SearchLinkParams {
	doctype: string;
	txt?: string;
	page_length?: number;
	query?: string;
	searchfield?: string;
	filters?: string;
	reference_doctype?: string;
}

/**
 * Debounced search hook for a Link field. Pass the target doctype + current
 * input text. Returns results suitable for an antd AutoComplete.
 */
export function useLinkSearch(
	doctype: string | undefined,
	txt: string,
	opts?: {
		filters?: Record<string, unknown>;
		reference_doctype?: string;
		page_length?: number;
		enabled?: boolean;
	},
) {
	const enabled = opts?.enabled ?? true;
	const params: SearchLinkParams = {
		doctype: doctype ?? '',
		txt,
		page_length: opts?.page_length ?? 20,
		reference_doctype: opts?.reference_doctype,
		filters: opts?.filters ? JSON.stringify(opts.filters) : undefined,
	};

	const swrKey = enabled && doctype ? ['search_link', doctype, txt, params.filters ?? '', params.reference_doctype ?? ''] : null;

	const { data, error, isLoading } = useFrappeGetCall<{ message: LinkSearchResult[] }>(
		'frappe.desk.search.search_link',
		params,
		swrKey,
		{
			revalidateIfStale: false,
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
			keepPreviousData: true,
		},
	);

	return useMemo(
		() => ({ results: data?.message ?? [], error, isLoading }),
		[data, error, isLoading],
	);
}
