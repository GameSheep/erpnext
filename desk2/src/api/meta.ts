/**
 * DocType metadata access — wraps `frappe.desk.form.load.getdoctype`.
 *
 * Returns the doctype's DocMeta (fields, permissions, submittable, etc.) along
 * with any dependent doctype metas Frappe bundles into the response. We cache
 * by doctype name so the form/list engines can call this freely.
 */

import { useFrappeGetCall } from 'frappe-react-sdk';
import type { SWRConfiguration } from 'swr';

import type { DocMeta } from '@/types/frappe';

interface GetDocTypeResponse {
	docs: Array<DocMeta | Record<string, unknown>>;
	__olutions?: unknown;
}

interface UseDocTypeResult {
	meta?: DocMeta;
	/** All other doctype metas bundled in the response (child tables, etc.). */
	related?: DocMeta[];
	isLoading: boolean;
	error: unknown;
	mutate: () => void;
}

/**
 * Fetch a doctype's metadata. The SWR key includes the doctype so multiple
 * components share the same cache entry.
 */
export function useDocType(doctype: string, options?: SWRConfiguration): UseDocTypeResult {
	const swrKey = doctype ? ['getdoctype', doctype] : null;
	const { data, error, isLoading, mutate } = useFrappeGetCall<GetDocTypeResponse>(
		'frappe.desk.form.load.getdoctype',
		{ doctype },
		swrKey,
		{ revalidateIfStale: false, revalidateOnFocus: false, revalidateOnReconnect: false, ...options },
	);

	const docs = data?.docs ?? [];
	const meta = docs.find((d): d is DocMeta => (d as DocMeta).name === doctype && (d as DocMeta).doctype === 'DocType');
	const related = docs.filter(
		(d): d is DocMeta =>
			(d as DocMeta).doctype === 'DocType' && (d as DocMeta).name !== doctype,
	);

	return { meta, related, isLoading, error, mutate };
}

/** Find a docfield by fieldname on a meta (case-insensitive). */
export function findField(meta: DocMeta | undefined, fieldname: string) {
	if (!meta || !fieldname) return undefined;
	const lower = fieldname.toLowerCase();
	return meta.fields.find((f) => f.fieldname.toLowerCase() === lower);
}

/** All value-carrying fields (exclude layout breaks, html, etc.). */
export function valueFields(meta: DocMeta): DocMeta['fields'] {
	return meta.fields.filter((f) => !['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Heading', 'Button'].includes(f.fieldtype));
}
