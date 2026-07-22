/**
 * useFetchFrom — resolves `fetch_from` dependencies server-side.
 *
 * Frappe's `fetch_from: "customer.customer_name"` means: when `customer` (a
 * Link field) changes, fetch the `customer_name` field from the linked
 * Customer doc and write it into THIS field. With `fetch_if_empty: 1`, only
 * fill when the target is currently empty.
 *
 * We scan the doctype meta for fetch_from rules keyed by their source link
 * field, and whenever that link field changes we call `frappe.client.get_value`
 * to fetch the linked doc's field, then dispatch a SET_VALUE.
 *
 * This is the generic mechanism. For more complex recomputations (tax math,
 * totals), form-config's `onFieldChange` handlers call `run_doc_method`.
 */

import { useEffect, useRef } from 'react';

import { useForm } from '@/components/form/FormContext';
import type { DocField, FrappeDoc } from '@/types/frappe';

interface FetchFromRule {
	/** The field that receives the fetched value (this field's fieldname). */
	targetField: string;
	/** The link field whose change triggers the fetch. */
	sourceLinkField: string;
	/** The fieldname on the linked doc to read. */
	sourceField: string;
	/** Only fill when target is empty. */
	ifEmpty: boolean;
}

/** Parse all `fetch_from` rules out of the meta, grouped by source link field. */
function collectRules(fieldList: DocField[]): Map<string, FetchFromRule[]> {
	const rules = new Map<string, FetchFromRule[]>();
	for (const df of fieldList) {
		if (!df.fetch_from) continue;
		// fetch_from syntax: "linkfield.fieldname" OR "linkfield:fieldname"
		// OR "@server_method@return_field" (server method — we skip those in stage 2).
		const m = String(df.fetch_from).match(/^([\w]+)[.:]([\w]+)$/);
		if (!m) continue;
		const sourceLinkField = m[1];
		const sourceField = m[2];
		const rule: FetchFromRule = {
			targetField: df.fieldname,
			sourceLinkField,
			sourceField,
			ifEmpty: df.fetch_if_empty === 1,
		};
		const list = rules.get(sourceLinkField) ?? [];
		list.push(rule);
		rules.set(sourceLinkField, list);
	}
	return rules;
}

/**
 * Watch the form's doc for changes to any link field that other fields
 * `fetch_from`. On change, fetch the linked field value and write it back.
 *
 * Mount this once inside a <FormProvider>.
 */
export function useFetchFrom() {
	const form = useForm();
	const { meta, state } = form;

	// Recompute the rule map only when the meta changes.
	const rulesRef = useRef<Map<string, FetchFromRule[]>>(new Map());
	rulesRef.current = collectRules(meta.fields);

	// Track the last-seen value of each source link field so we only fire on
	// actual changes (not every render).
	const lastSeen = useRef<Record<string, unknown>>({});

	useEffect(() => {
		const rules = rulesRef.current;
		if (rules.size === 0) return;
		const doc = state.doc;

		for (const [sourceField, ruleList] of rules) {
			const currentValue = doc[sourceField];
			const prev = lastSeen.current[sourceField];
			if (currentValue === prev) continue;
			lastSeen.current[sourceField] = currentValue;

			// Empty value → clear all dependent target fields.
			if (!currentValue) {
				for (const rule of ruleList) {
					form.setValue(rule.targetField, '', { silent: true });
				}
				continue;
			}

			// Resolve the linked doctype name from the source field's df.options.
			const sourceDf = meta.fields.find((f) => f.fieldname === sourceField);
			const targetDoctype = sourceDf?.options;
			if (!targetDoctype || typeof targetDoctype !== 'string') continue;

			// Skip if every rule's target is already filled and ifEmpty is set.
			const needsFetch = ruleList.filter((rule) => {
				if (!rule.ifEmpty) return true;
				const existing = doc[rule.targetField];
				return existing === undefined || existing === null || existing === '';
			});
			if (needsFetch.length === 0) continue;

			// Fetch the linked doc via REST and copy the resolved fields back.
			// Works for both real bench and mock mode (which intercepts /api/resource).
			void fetch(
				`/api/resource/${encodeURIComponent(targetDoctype)}/${encodeURIComponent(String(currentValue))}`,
				{ credentials: 'same-origin', headers: { Accept: 'application/json' } },
			)
				.then((r) => (r.ok ? r.json() : null))
				.then((json: { data?: FrappeDoc } | null) => {
					const data = json?.data;
					if (!data) return;
					for (const rule of needsFetch) {
						const v = data[rule.sourceField];
						if (v !== undefined) form.setValue(rule.targetField, v, { silent: true });
					}
				})
				.catch(() => {
					/* ignore — field just stays empty */
				});
		}
	}, [state.doc, meta, form]);
}
