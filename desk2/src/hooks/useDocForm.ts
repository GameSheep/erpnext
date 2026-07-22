/**
 * useDocForm — top-level orchestration hook for the Form view.
 *
 * Responsibilities:
 *  1. Load the document + doctype meta (parallel, with SWR caching).
 *  2. Maintain a `FormProvider`-compatible state (delegated to FormContext).
 *  3. Expose save/submit/cancel/amend/delete actions that call Frappe's
 *     resource API and re-sync the doc.
 *  4. Resolve dynamic-filter context (e.g. fetch_from server round-trips) —
 *     in stage 1 we delegate this to run_doc_method on the backend.
 */

import { useCallback, useMemo, useState } from 'react';
import { useSWRConfig, useFrappeCreateDoc, useFrappeDeleteDoc, useFrappeUpdateDoc } from 'frappe-react-sdk';
import { App as AntdApp } from 'antd';

import { useDoc } from '@/api/resource';
import { useDocType } from '@/api/meta';
import type { DocMeta, FrappeDoc } from '@/types/frappe';
import { getErrorMessage } from '@/lib/frappe';

export interface UseDocFormResult {
	doctype: string;
	docname: string;
	isNew: boolean;
	meta?: DocMeta;
	doc?: FrappeDoc;
	isLoading: boolean;
	isSaving: boolean;
	error: unknown;
	/** Reload the doc + meta from the server. */
	reload: () => void;
	/** Save (create or update). Returns the saved doc. */
	save: (doc: FrappeDoc) => Promise<FrappeDoc>;
	/** Submit a submittable doc. */
	submit: (doc: FrappeDoc) => Promise<FrappeDoc>;
	/** Cancel a submitted doc. */
	cancel: (doc: FrappeDoc) => Promise<FrappeDoc>;
	/** Amend a cancelled doc (creates a new draft). */
	amend: (doc: FrappeDoc) => Promise<FrappeDoc>;
	/** Delete a draft doc. */
	remove: () => Promise<void>;
}

/**
 * @param doctype Frappe doctype name (e.g. "Sales Invoice").
 * @param docname Document name OR a "new-{doctype}-1" style new-doc placeholder.
 */
export function useDocForm(doctype: string, docname: string | undefined): UseDocFormResult {
	const isNew = !docname || docname.startsWith('new-');
	const { notification } = AntdApp.useApp();

	const metaQuery = useDocType(doctype);
	const docQuery = useDoc<FrappeDoc>(doctype, isNew ? undefined : docname);

	const createDoc = useFrappeCreateDoc<FrappeDoc>();
	const updateDoc = useFrappeUpdateDoc<FrappeDoc>();
	const deleteDoc = useFrappeDeleteDoc();
	const { mutate: mutateGlobal } = useSWRConfig();

	const [saving, setSaving] = useState(false);

	const meta = metaQuery.meta;
	const doc = docQuery.data as FrappeDoc | undefined;

	const reload = useCallback(() => {
		void metaQuery.mutate();
		void docQuery.mutate();
	}, [metaQuery, docQuery]);

	const invalidateLists = useCallback(() => {
		// Invalidate all doclist caches for this doctype.
		void mutateGlobal((key) => Array.isArray(key) && key[0] === 'doclist' && key[1] === doctype);
	}, [mutateGlobal, doctype]);

	const save = useCallback(
		async (input: FrappeDoc) => {
			setSaving(true);
			try {
				let saved: FrappeDoc;
				if (isNew) {
					saved = await createDoc.createDoc(doctype, { ...input, doctype });
				} else {
					saved = await updateDoc.updateDoc(doctype, docname!, { ...input, doctype });
				}
				void docQuery.mutate(saved as unknown as Parameters<typeof docQuery.mutate>[0], { revalidate: false });
				invalidateLists();
				return saved;
			} catch (err) {
				notification.error({ message: 'Save failed', description: getErrorMessage(err) });
				throw err;
			} finally {
				setSaving(false);
			}
		},
		[doctype, docname, isNew, createDoc, updateDoc, docQuery, invalidateLists, notification],
	);

	const submit = useCallback(
		async (input: FrappeDoc) => {
			setSaving(true);
			try {
				const saved = await updateDoc.updateDoc(doctype, docname!, {
					...input,
					doctype,
					docstatus: 1,
				});
				void docQuery.mutate(saved as unknown as Parameters<typeof docQuery.mutate>[0], { revalidate: false });
				invalidateLists();
				return saved;
			} catch (err) {
				notification.error({ message: 'Submit failed', description: getErrorMessage(err) });
				throw err;
			} finally {
				setSaving(false);
			}
		},
		[doctype, docname, updateDoc, docQuery, invalidateLists, notification],
	);

	const cancel = useCallback(
		async (input: FrappeDoc) => {
			setSaving(true);
			try {
				const saved = await updateDoc.updateDoc(doctype, docname!, {
					...input,
					doctype,
					docstatus: 2,
				});
				void docQuery.mutate(saved as unknown as Parameters<typeof docQuery.mutate>[0], { revalidate: false });
				invalidateLists();
				return saved;
			} catch (err) {
				notification.error({ message: 'Cancel failed', description: getErrorMessage(err) });
				throw err;
			} finally {
				setSaving(false);
			}
		},
		[doctype, docname, updateDoc, docQuery, invalidateLists, notification],
	);

	const amend = useCallback(
		async (input: FrappeDoc) => {
			setSaving(true);
			try {
				const { __islocal, __unsaved, docstatus, ...rest } = input as FrappeDoc & {
					__islocal?: number;
					__unsaved?: number;
				};
				void __islocal; void __unsaved; void docstatus;
				const saved = await createDoc.createDoc(doctype, { ...rest, doctype, amended_from: docname });
				invalidateLists();
				return saved;
			} catch (err) {
				notification.error({ message: 'Amend failed', description: getErrorMessage(err) });
				throw err;
			} finally {
				setSaving(false);
			}
		},
		[doctype, docname, createDoc, invalidateLists, notification],
	);

	const remove = useCallback(async () => {
		setSaving(true);
		try {
			await deleteDoc.deleteDoc(doctype, docname);
			invalidateLists();
		} catch (err) {
			notification.error({ message: 'Delete failed', description: getErrorMessage(err) });
			throw err;
		} finally {
			setSaving(false);
		}
	}, [doctype, docname, deleteDoc, invalidateLists, notification]);

	// When meta loads, we could prefetch related child metas — skip in stage 1.

	return useMemo(
		() => ({
			doctype,
			docname: docname ?? '',
			isNew,
			meta,
			doc,
			isLoading: metaQuery.isLoading || (!isNew && docQuery.isLoading),
			isSaving: saving,
			error: metaQuery.error ?? docQuery.error,
			reload,
			save,
			submit,
			cancel,
			amend,
			remove,
		}),
		[doctype, docname, isNew, meta, doc, metaQuery.isLoading, docQuery.isLoading, saving, metaQuery.error, docQuery.error, reload, save, submit, cancel, amend, remove],
	);
}
