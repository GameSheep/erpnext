/**
 * useDocEvents — bridges Frappe's `frappe.ui.form.on(...)` event model to our
 * React form engine.
 *
 * Strategy (matches our plan §5.2): we DON'T load the original *.js files.
 * Instead each doctype gets a typed declaration file in `src/form-config/`
 * that registers lifecycle handlers (setup / onload / refresh) and per-field
 * handlers. This hook looks up the config for the current doctype and wires
 * its handlers into the FormContext's onChange/dispatch.
 *
 * In stage 1 we only wire the lifecycle handlers (setup/onload/refresh) and
 * the `onChange` callback. Per-field fetch_from / server-side recomputation
 * is delegated to run_doc_method via a later iteration.
 */

import { useEffect, useRef } from 'react';

import { useForm } from '@/components/form/FormContext';
import type { FrappeDoc } from '@/types/frappe';
import { getFormConfig, type FormConfig, type FormHandlers } from '@/form-config';

export interface UseDocEventsOptions {
	doctype: string;
	/** Fired once after the doc first loads. */
	onLoad?: (doc: FrappeDoc) => void;
}

/**
 * Looks up the (optional) form-config for the doctype and dispatches its
 * `setup` / `onload` / `refresh` callbacks at the right times. Also wires
 * per-field change handlers.
 */
export function useDocEvents({ doctype }: UseDocEventsOptions) {
	const form = useForm();
	const config = getFormConfig(doctype) as FormConfig | undefined;
	const handlersRef = useRef<FormHandlers | undefined>(config?.handlers);

	// Re-resolve handlers when the doctype changes.
	useEffect(() => {
		handlersRef.current = config?.handlers;
	}, [config]);

	// setup — once per FormProvider mount.
	useEffect(() => {
		const h = handlersRef.current?.setup;
		if (!h) return;
		try {
			h(form);
		} catch (err) {
			console.error(`[form-config:${doctype}] setup() threw`, err);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// onload — when the doc is first loaded (originalDoc becomes populated).
	const didLoad = useRef(false);
	useEffect(() => {
		if (didLoad.current) return;
		if (form.state.doc.__islocal) return; // skip new docs
		const h = handlersRef.current?.onload;
		if (!h) {
			didLoad.current = true;
			return;
		}
		try {
			h(form, form.state.doc);
			didLoad.current = true;
		} catch (err) {
			console.error(`[form-config:${doctype}] onload() threw`, err);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [form.state.doc.name]);

	// refresh — when the doc identity or dirty state resets.
	useEffect(() => {
		const h = handlersRef.current?.refresh;
		if (!h) return;
		try {
			h(form, form.state.doc);
		} catch (err) {
			console.error(`[form-config:${doctype}] refresh() threw`, err);
		}
	}, [form.state.doc, form.state.doc.docstatus, form.meta]);

	// Per-field handlers are wired through the FormProvider's onChange prop
	// (see FormView). This hook just makes config discoverable.

	return { config };
}
