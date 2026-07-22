/**
 * Form context — the heart of the form engine.
 *
 * This is our reimplementation of Frappe's `frm` object. The form holds a
 * single source of truth (the `doc`) plus a layer of *runtime overrides*
 * (df_property_overrides) that controllers / depends_on expressions mutate via
 * `set_df_property`, `toggle_display`, etc.
 *
 * The state machine is intentionally a useReducer so that:
 *  - every state transition is auditable
 *  - we can re-evaluate depends_on after any change in a single pass
 *  - child components subscribe to specific fields (via useFormField) without
 *    re-rendering the whole form on every keystroke
 *
 * This is a non-trivial rewrite of Frappe's frappe.ui.form.FormController —
 * the original is ~5k lines of jQuery. We replace the pub/sub with React state.
 */

import {
	 createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	type ReactNode,
} from 'react';

import type { DocField, DocMeta, FrappeDoc } from '@/types/frappe';
import { evalDependsOn } from '@/lib/depends-on';

/** Runtime override for a single DocField property. */
export interface DfOverride {
	hidden?: boolean;
	read_only?: boolean;
	reqd?: boolean;
	label?: string;
	options?: string | string[];
	description?: string;
	default?: unknown;
	precision?: number;
	/** Link query filter (server-side). */
	link_filters?: unknown;
	/** Force-refresh of dependent fields. */
	_dirty?: number;
	[key: string]: unknown;
}

export interface FormState {
	/** Current document values (mutable copy; never mutate directly). */
	doc: FrappeDoc;
	/** Original doc as loaded (for dirty detection). */
	originalDoc: FrappeDoc;
	/** Per-fieldname property overrides. */
	dfOverrides: Record<string, DfOverride>;
	/** Custom buttons added via frm.add_custom_button. */
	customButtons: CustomButton[];
	/** Validation errors keyed by fieldname. */
	errors: Record<string, string>;
	/** Whether the form is currently submitting. */
	saving: boolean;
	/** Whether the user has unsaved changes. */
	dirty: boolean;
}

export interface CustomButton {
	label: string;
	onClick: () => void;
	group?: string;
	variant?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
	icon?: ReactNode;
}

type Action =
	| { type: 'SET_DOC'; doc: FrappeDoc }
	| { type: 'SET_VALUE'; fieldname: string; value: unknown }
	| { type: 'SET_VALUES'; values: Record<string, unknown> }
	| { type: 'SET_CHILD_VALUE'; tableField: string; rowName: string; fieldname: string; value: unknown }
	| { type: 'ADD_CHILD_ROW'; tableField: string; row: Record<string, unknown> }
	| { type: 'REMOVE_CHILD_ROW'; tableField: string; rowName: string }
	| { type: 'MOVE_CHILD_ROW'; tableField: string; from: number; to: number }
	| { type: 'SET_DF_PROPERTY'; fieldname: string; prop: string; value: unknown }
	| { type: 'TOGGLE_DISPLAY'; fieldname: string; shown: boolean }
	| { type: 'TOGGLE_REQD'; fieldname: string; reqd: boolean }
	| { type: 'TOGGLE_ENABLE'; fieldname: string; enabled: boolean }
	| { type: 'ADD_CUSTOM_BUTTON'; button: CustomButton }
	| { type: 'CLEAR_CUSTOM_BUTTONS' }
	| { type: 'SET_ERROR'; fieldname: string; message: string | undefined }
	| { type: 'CLEAR_ERRORS' }
	| { type: 'SET_SAVING'; saving: boolean }
	| { type: 'MARK_CLEAN'; doc?: FrappeDoc };

function shallowEqualDoc(a: FrappeDoc, b: FrappeDoc): boolean {
	const ak = Object.keys(a);
	const bk = Object.keys(b);
	if (ak.length !== bk.length) return false;
	for (const k of ak) {
		if (a[k] !== b[k]) return false;
	}
	return true;
}

function reducer(state: FormState, action: Action): FormState {
	switch (action.type) {
		case 'SET_DOC': {
			return { ...state, doc: action.doc, originalDoc: action.doc, dirty: false, errors: {} };
		}
		case 'SET_VALUE': {
			if (state.doc[action.fieldname] === action.value) return state;
			const doc = { ...state.doc, [action.fieldname]: action.value };
			return { ...state, doc, dirty: !shallowEqualDoc(doc, state.originalDoc) };
		}
		case 'SET_VALUES': {
			const doc = { ...state.doc, ...action.values };
			return { ...state, doc, dirty: !shallowEqualDoc(doc, state.originalDoc) };
		}
		case 'SET_CHILD_VALUE': {
			const table = (state.doc[action.tableField] as FrappeDoc[]) ?? [];
			const newTable = table.map((row) =>
				row.name === action.rowName ? { ...row, [action.fieldname]: action.value } : row,
			);
			const doc = { ...state.doc, [action.tableField]: newTable };
			return { ...state, doc, dirty: true };
		}
		case 'ADD_CHILD_ROW': {
			const table = (state.doc[action.tableField] as FrappeDoc[]) ?? [];
			const newRow = {
				name: `new-${action.tableField}-${Date.now()}`,
				__islocal: 1 as const,
				...action.row,
			} as FrappeDoc;
			const doc = { ...state.doc, [action.tableField]: [...table, newRow] };
			return { ...state, doc, dirty: true };
		}
		case 'REMOVE_CHILD_ROW': {
			const table = (state.doc[action.tableField] as FrappeDoc[]) ?? [];
			const newTable = table.filter((row) => row.name !== action.rowName);
			const doc = { ...state.doc, [action.tableField]: newTable };
			return { ...state, doc, dirty: true };
		}
		case 'MOVE_CHILD_ROW': {
			const table = (state.doc[action.tableField] as FrappeDoc[]) ?? [];
			const newTable = [...table];
			const [moved] = newTable.splice(action.from, 1);
			newTable.splice(action.to, 0, moved);
			const doc = { ...state.doc, [action.tableField]: newTable };
			return { ...state, doc, dirty: true };
		}
		case 'SET_DF_PROPERTY': {
			const existing = state.dfOverrides[action.fieldname] ?? {};
			return {
				...state,
				dfOverrides: {
					...state.dfOverrides,
					[action.fieldname]: { ...existing, [action.prop]: action.value, _dirty: Date.now() },
				},
			};
		}
		case 'TOGGLE_DISPLAY': {
			const existing = state.dfOverrides[action.fieldname] ?? {};
			return {
				...state,
				dfOverrides: { ...state.dfOverrides, [action.fieldname]: { ...existing, hidden: !action.shown } },
			};
		}
		case 'TOGGLE_REQD': {
			const existing = state.dfOverrides[action.fieldname] ?? {};
			return {
				...state,
				dfOverrides: { ...state.dfOverrides, [action.fieldname]: { ...existing, reqd: action.reqd } },
			};
		}
		case 'TOGGLE_ENABLE': {
			const existing = state.dfOverrides[action.fieldname] ?? {};
			return {
				...state,
				dfOverrides: { ...state.dfOverrides, [action.fieldname]: { ...existing, read_only: !action.enabled } },
			};
		}
		case 'ADD_CUSTOM_BUTTON': {
			return { ...state, customButtons: [...state.customButtons, action.button] };
		}
		case 'CLEAR_CUSTOM_BUTTONS': {
			return { ...state, customButtons: [] };
		}
		case 'SET_ERROR': {
			const errors = { ...state.errors };
			if (action.message === undefined) delete errors[action.fieldname];
			else errors[action.fieldname] = action.message;
			return { ...state, errors };
		}
		case 'CLEAR_ERRORS': {
			return { ...state, errors: {} };
		}
		case 'SET_SAVING': {
			return { ...state, saving: action.saving };
		}
		case 'MARK_CLEAN': {
			const doc = action.doc ?? state.doc;
			return { ...state, doc, originalDoc: doc, dirty: false };
		}
		default:
			return state;
	}
}

export interface FormContextValue {
	state: FormState;
	meta: DocMeta;
	dispatch: React.Dispatch<Action>;
	/** Frappe-compatible helper: set a single value + dispatch change events. */
	setValue: (fieldname: string, value: unknown, opts?: { silent?: boolean }) => void;
	/** Set multiple values at once. */
	setValues: (values: Record<string, unknown>) => void;
	/** Read the merged DocField (meta + runtime override). */
	getField: (fieldname: string) => DocField | undefined;
	/** Effective df property after runtime overrides. */
	getDf: (fieldname: string) => DocField & DfOverride;
	/** Whether a field should currently be visible (eval depends_on + overrides). */
	isFieldVisible: (fieldname: string) => boolean;
	/** Whether a field is currently required. */
	isFieldRequired: (fieldname: string) => boolean;
	/** Whether a field is currently read-only. */
	isFieldReadOnly: (fieldname: string) => boolean;
}

const FormCtx = createContext<FormContextValue | null>(null);

export interface FormProviderProps {
	meta: DocMeta;
	initialDoc: FrappeDoc;
	children: ReactNode;
	/**
	 * Called whenever a field value changes (for controllers to react).
	 * Receives the current form object so handlers can call setValue / dispatch /
	 * set_df_property just like Frappe's `frm` in `frappe.ui.form.on`.
	 */
	onChange?: (fieldname: string, value: unknown, doc: FrappeDoc, form: FormContextValue) => void;
}

export function FormProvider({ meta, initialDoc, children, onChange }: FormProviderProps) {
	const [state, dispatch] = useReducer(reducer, {
		doc: initialDoc,
		originalDoc: initialDoc,
		dfOverrides: {},
		customButtons: [],
		errors: {},
		saving: false,
		dirty: false,
	});

	// Keep onChange ref to avoid stale closures.
	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	// formRef holds the latest FormContextValue so we can pass `form` to
	// onChange callbacks without stale-closure issues.
	const formRef = useRef<FormContextValue | null>(null);

	const setValue = useCallback(
		(fieldname: string, value: unknown, opts?: { silent?: boolean }) => {
			dispatch({ type: 'SET_VALUE', fieldname, value });
			if (!opts?.silent) {
				// Defer to next tick so formRef.current reflects the updated state.
				queueMicrotask(() => {
					const nextDoc = { ...(formRef.current?.state.doc ?? state.doc), [fieldname]: value } as FrappeDoc;
					onChangeRef.current?.(fieldname, value, nextDoc, formRef.current as FormContextValue);
				});
			}
		},
		[state.doc],
	);

	const setValues = useCallback(
		(values: Record<string, unknown>) => {
			dispatch({ type: 'SET_VALUES', values });
			Object.entries(values).forEach(([fieldname, value]) => {
				queueMicrotask(() => {
					const nextDoc = { ...(formRef.current?.state.doc ?? state.doc), ...values } as FrappeDoc;
					onChangeRef.current?.(fieldname, value, nextDoc, formRef.current as FormContextValue);
				});
			});
		},
		[state.doc],
	);

	const getField = useCallback(
		(fieldname: string) => meta.fields.find((f) => f.fieldname === fieldname),
		[meta],
	);

	const getDf = useCallback(
		(fieldname: string): DocField & DfOverride => {
			const base = getField(fieldname) ?? ({ fieldname, fieldtype: 'Data' } as DocField);
			const override = state.dfOverrides[fieldname] ?? {};
			return {
				...base,
				hidden: base.hidden === 1 || override.hidden === true ? 1 : 0,
				read_only: base.read_only === 1 || override.read_only === true ? 1 : 0,
				reqd: (override.reqd ?? base.reqd === 1) ? 1 : 0,
				...override,
			} as DocField & DfOverride;
		},
		[getField, state.dfOverrides],
	);

	const isFieldVisible = useCallback(
		(fieldname: string) => {
			const df = getField(fieldname);
			if (!df) return false;
			if (df.hidden === 1) return false;
			if (state.dfOverrides[fieldname]?.hidden === true) return false;
			if (df.depends_on) {
				return evalDependsOn(df.depends_on, { doc: state.doc, frm: { doc: state.doc } });
			}
			return true;
		},
		[getField, state.dfOverrides, state.doc],
	);

	const isFieldRequired = useCallback(
		(fieldname: string) => {
			const df = getField(fieldname);
			if (!df) return false;
			if (state.dfOverrides[fieldname]?.reqd !== undefined) {
				return !!state.dfOverrides[fieldname]?.reqd;
			}
			if (df.reqd === 1) return true;
			if (df.mandatory_depends_on) {
				return evalDependsOn(df.mandatory_depends_on, { doc: state.doc, frm: { doc: state.doc } });
			}
			return false;
		},
		[getField, state.dfOverrides, state.doc],
	);

	const isFieldReadOnly = useCallback(
		(fieldname: string) => {
			const df = getField(fieldname);
			if (!df) return true;
			if (df.read_only === 1) return true;
			if (state.dfOverrides[fieldname]?.read_only === true) return true;
			if (df.read_only_depends_on) {
				return evalDependsOn(df.read_only_depends_on, { doc: state.doc, frm: { doc: state.doc } });
			}
			return false;
		},
		[getField, state.dfOverrides, state.doc],
	);

	const value = useMemo<FormContextValue>(
		() => ({
			state,
			meta,
			dispatch,
			setValue,
			setValues,
			getField,
			getDf,
			isFieldVisible,
			isFieldRequired,
			isFieldReadOnly,
		}),
		[state, meta, setValue, setValues, getField, getDf, isFieldVisible, isFieldRequired, isFieldReadOnly],
	);

	// Keep formRef in sync so setValue's onChange callback hands callers the
	// freshest form object (avoiding stale-closure bugs in form-config handlers).
	formRef.current = value;

	return <FormCtx.Provider value={value}>{children}</FormCtx.Provider>;
}

/** Access the full form context. Prefer useFormField for value-only subscriptions. */
export function useForm(): FormContextValue {
	const ctx = useContext(FormCtx);
	if (!ctx) throw new Error('useForm must be used within a <FormProvider>');
	return ctx;
}

/**
 * Subscribe to a single field's value. Re-renders only when that value (or its
 * df override) changes — keeps keystroke-heavy forms fast.
 */
export function useFieldValue(fieldname: string): [unknown, (v: unknown) => void] {
	const { state, setValue } = useForm();
	const value = state.doc[fieldname];
	const setter = useCallback((v: unknown) => setValue(fieldname, v), [fieldname, setValue]);
	return [value, setter];
}
