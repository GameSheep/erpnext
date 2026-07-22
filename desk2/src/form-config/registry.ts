/**
 * form-config registry — per-doctype declarations that replace Frappe's
 * `frappe.ui.form.on(...)` and controller-class logic.
 *
 * Each doctype that needs custom form behaviour (custom buttons, make_methods,
 * link filters, validation, fetch_from side effects) gets a config file in
 * this folder. The config is plain TS so it's type-checked and tree-shakeable.
 *
 * The registry is intentionally minimal in stage 1: just handlers. We'll add
 * `customButtons`, `makeMethods`, `linkFilters`, `validations` shapes as the
 * engine matures.
 *
 * Pattern: each doctype file exports a default `FormConfig` and calls
 * `register('Sales Invoice', config)` at import time. The index.ts imports all
 * of them so they self-register on app boot.
 */

import type { FormContextValue } from '@/components/form/FormContext';
import type { FrappeDoc } from '@/types/frappe';

export type Form = FormContextValue;

export interface FormHandlers {
	/** Runs once on form mount. Use to register setup side-effects. */
	setup?: (form: Form) => void;
	/** Runs after the doc is loaded (not for new docs). */
	onload?: (form: Form, doc: FrappeDoc) => void;
	/** Runs on every doc / docstatus change. */
	refresh?: (form: Form, doc: FrappeDoc) => void;
	/** Runs before save — return false to abort. */
	validate?: (form: Form, doc: FrappeDoc) => boolean | void;
	/** Runs when a specific field's value changes. Keyed by fieldname. */
	onFieldChange?: Record<string, (form: Form, value: unknown, doc: FrappeDoc) => void>;
}

export interface FormConfig {
	handlers?: FormHandlers;
	/** Custom buttons to render in the action bar. */
	customButtons?: Array<{
		label: string;
		group?: string;
		variant?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
		/** Show condition based on current doc state. */
		show?: (doc: FrappeDoc) => boolean;
		/** Click handler — receives the form. */
		onClick: (form: Form) => void;
	}>;
	/** "Make" targets (Create→X dropdown in Frappe). */
	makeMethods?: Array<{
		label: string;
		/** Backend method that maps the current doc to a new doc. */
		method: string;
	}>;
	/** Server-side link filter overrides per fieldname. */
	linkFilters?: Record<string, (doc: FrappeDoc) => Record<string, unknown>>;
}

const registry = new Map<string, FormConfig>();

export function register(doctype: string, config: FormConfig): void {
	registry.set(doctype, config);
}

export function getRegistry(): Map<string, FormConfig> {
	return registry;
}

export function getFormConfig(doctype: string): FormConfig | undefined {
	return registry.get(doctype);
}
