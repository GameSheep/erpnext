/**
 * Core Frappe metadata + document types.
 *
 * These mirror the server-side data emitted by:
 *   - `frappe.sessions.get()`         → `frappe.boot`        (the boot payload)
 *   - `frappe.desk.form.load.getdoctype` → `DocMeta` + `DocField[]`
 *   - `frappe.desk.form.load.get_doc` / `frappe.client.get`  → `FrappeDoc`
 *
 * Reference: banking/src/types/* (hand-written TS interfaces that mirror Frappe
 * doctype schemas 1:1) and the field-type census taken from erpnext doctype JSON.
 */

/** The full set of DocType fieldtypes Frappe ships with. */
export type FieldType =
	| 'Data'
	| 'Small Text'
	| 'Long Text'
	| 'Text'
	| 'Text Editor'
	| 'Code'
	| 'HTML'
	| 'Heading'
	| 'Select'
	| 'Autocomplete'
	| 'Link'
	| 'Dynamic Link'
	| 'Date'
	| 'Datetime'
	| 'Time'
	| 'Duration'
	| 'Password'
	| 'Check'
	| 'Int'
	| 'Float'
	| 'Currency'
	| 'Percent'
	| 'Barcode'
	| 'Geolocation'
	| 'Signature'
	| 'Color'
	| 'Attach'
	| 'Attach Image'
	| 'Image'
	| 'Table'
	| 'Table MultiSelect'
	| 'Section Break'
	| 'Column Break'
	| 'Tab Break'
	| 'Button'
	| 'Read Only'
	| 'JSON'
	// Report-filter-only types
	| 'Break'
	| 'MultiSelectList';

/** Fieldtypes that carry a value the user can edit (vs. layout/presentation). */
export const VALUE_FIELDTYPES: ReadonlySet<FieldType> = new Set<FieldType>([
	'Data',
	'Small Text',
	'Long Text',
	'Text',
	'Text Editor',
	'Code',
	'Select',
	'Autocomplete',
	'Link',
	'Dynamic Link',
	'Date',
	'Datetime',
	'Time',
	'Duration',
	'Password',
	'Check',
	'Int',
	'Float',
	'Currency',
	'Percent',
	'Barcode',
	'Geolocation',
	'Signature',
	'Color',
	'Attach',
	'Attach Image',
	'Image',
	'Table',
	'Table MultiSelect',
	'JSON',
]);

/** Fieldtypes that drive layout (not values). */
export const LAYOUT_FIELDTYPES: ReadonlySet<FieldType> = new Set<FieldType>([
	'Section Break',
	'Column Break',
	'Tab Break',
	'HTML',
	'Heading',
	'Button',
	'Read Only',
	'Break',
]);

/** A single field definition from a DocType's `fields` array. */
export interface DocField {
	fieldname: string;
	fieldtype: FieldType;
	label?: string;
	options?: string;
	/** On Select: newline-separated list. On Link: target doctype. On Section/Column Break: width or icon. */
	default?: string | number | boolean | null;
	description?: string;
	reqd?: 0 | 1;
	hidden?: 0 | 1;
	read_only?: 0 | 1;
	bold?: 0 | 1;
	precision?: number;
	length?: number;
	width?: string;
	columns?: number;
	permlevel?: number;
	in_list_view?: 0 | 1;
	in_standard_filter?: 0 | 1;
	in_global_search?: 0 | 1;
	in_filter?: 0 | 1;
	search_index?: 0 | 1;
	allow_on_submit?: 0 | 1;
	allow_bulk_edit?: 0 | 1;
	allow_in_quick_entry?: 0 | 1;
	no_copy?: 0 | 1;
	set_only_once?: 0 | 1;
	remember_last_selected_value?: 0 | 1;
	print_hide?: 0 | 1;
	report_hide?: 0 | 1;
	show_dashboard?: 0 | 1;
	translatable?: 0 | 1;
	is_virtual?: 0 | 1;
	/** Layout-only properties. */
	collapsible?: 0 | 1;
	collapsible_depends_on?: string;
	hide_border?: 0 | 1;
	hide_days?: 0 | 1;
	hide_seconds?: 0 | 1;
	/** Dependency expressions (JS string the form engine must eval). */
	depends_on?: string;
	mandatory_depends_on?: string;
	read_only_depends_on?: string;
	/** Server-side fetch: `linkfield.fieldname` populates this field. */
	fetch_from?: string;
	fetch_if_empty?: 0 | 1;
	/** Number / currency formatting hints. */
	non_negative?: 0 | 1;
	ignore_user_permissions?: 0 | 1;
}

/** Role-level permissions entry from a DocType's `permissions` array. */
export interface DocPerm {
	role: string;
	read?: 0 | 1;
	write?: 0 | 1;
	create?: 0 | 1;
	delete?: 0 | 1;
	submit?: 0 | 1;
	cancel?: 0 | 1;
	amend?: 0 | 1;
	report?: 0 | 1;
	email?: 0 | 1;
	print?: 0 | 1;
	share?: 0 | 1;
	export?: 0 | 1;
	import?: 0 | 1;
	set_user_permissions?: 0 | 1;
	if_owner?: 0 | 1;
	permlevel?: number;
}

/** The DocType metadata itself (the result of getdoctype for the parent). */
export interface DocMeta {
	name: string;
	doctype: 'DocType';
	module: string;
	/** The doctype's own metadata fields. */
	autoname?: string;
	naming_rule?: string;
	istable?: 0 | 1;
	editable_grid?: 0 | 1;
	is_submittable?: 0 | 1;
	read_only?: 0 | 1;
	in_create?: 0 | 1;
	quick_entry?: 0 | 1;
	track_changes?: 0 | 1;
	track_seen?: 0 | 1;
	track_views?: 0 | 1;
	allow_rename?: 0 | 1;
	allow_import?: 0 | 1;
	allow_copy?: 0 | 1;
	max_attachments?: number;
	image_field?: string;
	image_view?: 0 | 1;
	title_field?: string;
	search_fields?: string;
	default_view?: string;
	default_print_format?: string;
	has_web_view?: 0 | 1;
	allow_auto_repeat?: 0 | 1;
	is_tree?: 0 | 1;
	nsm_parent_field?: string;
	website_search_field?: string;
	/** Form / listview behaviour. */
	calendar_field?: string;
	gantt_field?: string;
	gantt_progress_field?: string;
	kanban_field?: string;
	/** The schema arrays we render against. */
	fields: DocField[];
	permissions: DocPerm[];
	/** Optional dashboard hook (doctype_dashboard.py → get_data()). */
	__dashboard?: DashboardConfig;
	/** Optional JS-driven listview settings (we re-declare in TS instead). */
	__listview?: unknown;
	/** Misc runtime metadata that some endpoints bundle in. */
	[key: string]: unknown;
}

/**
 * docstatus: 0 = Draft, 1 = Submitted, 2 = Cancelled.
 * Submittable doctypes cycle through these states.
 */
export type DocStatus = 0 | 1 | 2;

/**
 * A document record. Indexed by fieldname, plus a few framework bookkeeping keys.
 * Generic `T` carries the doctype-specific field values; falls back to an
 * open-ended record when the caller hasn't typed the schema.
 */
export type FrappeDoc<T = Record<string, unknown>> = {
	name: string;
	doctype: string;
	owner?: string;
	creation?: string;
	modified?: string;
	modified_by?: string;
	parent?: string;
	parenttype?: string;
	parentfield?: string;
	docstatus?: DocStatus;
	idx?: number;
	/** Set transiently when the doc exists only in memory (not yet saved). */
	__islocal?: 1 | 0;
	__unsaved?: 1 | 0;
	__unedited?: 1 | 0;
	/** Used for new child rows. */
	__removed?: 1 | 0;
	/** Frappe sometimes returns comments/attachments alongside. */
	comments?: unknown[];
	attachments?: unknown[];
	assignments?: unknown[];
	permissions?: Record<string, 0 | 1>;
	allowed?: 0 | 1;
	liked_by?: string;
	views?: string;
} & {
	[P in keyof T]: T[P];
};

/** A child-table row is the same shape but lives inside a parent doc. */
export type ChildDoc<T = Record<string, unknown>> = FrappeDoc<T> & {
	parent: string;
	parenttype: string;
	parentfield: string;
};

/** Boot-time per-user permission summary. */
export interface BootUser {
	name: string;
	email?: string;
	full_name?: string;
	user_type?: string;
	language?: string;
	time_zone?: string;
	defaults?: Record<string, string | number | boolean>;
	can_read?: string[];
	can_write?: string[];
	can_create?: string[];
	can_delete?: string[];
	can_submit?: string[];
	can_cancel?: string[];
	can_amend?: string[];
	can_export?: string[];
	can_import?: string[];
	can_print?: string[];
	can_email?: string[];
	can_report?: string[];
	roles?: string[];
	employee?: string;
	/** Whether the user is the Administrator. */
	is_admin?: boolean;
}

/** The boot payload injected by erpnext/www/desk2.py → index.html. */
export interface BootPayload {
	sitename: string;
	user: BootUser;
	sysdefaults: Record<string, string | number | boolean>;
	/** e.g. `dd-mm-yyyy`. */
	date_format?: string;
	time_format?: string;
	number_format?: string;
	first_day_of_the_week?: string;
	float_precision?: string | number;
	currency_precision?: string | number;
	rounding_method?: string;
	/** Theme + locale. */
	desk_theme?: 'Light' | 'Dark' | 'Automatic';
	lang?: string;
	translations_version?: string | number;
	/** Timezone info. */
	time_zone?: {
		system?: string;
		user?: string;
	};
	/** Realtime. */
	socketio_port?: number | string;
	site_name?: string;
	/** Doctype metas + singletons (cached in `locals`). */
	docs?: Array<Record<string, unknown>>;
	/** The full message catalog (when present inline). */
	__messages?: Record<string, string>;
	layout_direction?: 'ltr' | 'rtl';
	/** ERPNext specifics injected by erpnext.startup.boot.boot_session. */
	customer_count?: number;
	setup_complete?: 'Yes' | 'No';
	/** Anything else — Frappe adds keys freely across versions. */
	[key: string]: unknown;
}

/** `frappe` global object populated by index.html before React boots. */
declare global {
	interface Window {
		frappe?: {
			boot?: BootPayload;
			csrf_token?: string;
			_messages?: Record<string, string>;
			_translations_loaded?: Promise<unknown>;
			/** Resolved later by lib/frappe.ts for synchronous access. */
			model?: { sync?: (docs: unknown[]) => void };
		};
	}
}

/** DocType dashboard config returned by `<doctype>_dashboard.py` `get_data()`. */
export interface DashboardConfig {
	fieldname?: string;
	data?: Array<{
		name: string;
		label?: string;
		value?: number | string;
		plot?: unknown;
	}>;
	charts?: Array<{
		name: string;
		label?: string;
		type?: string;
		data?: unknown;
	}>;
	custom_routes?: Array<{ name: string; label?: string; route?: string }>;
}

/** A Workspace link entry (one row of the legacy `links` array). */
export interface WorkspaceLink {
	label?: string;
	link_to?: string;
	link_type?: 'DocType' | 'Report' | 'Page' | 'Dashboard' | 'Workspace' | string;
	type?: 'Link' | 'Card Break' | 'URL' | string;
	dependencies?: string;
	is_query_report?: 0 | 1;
	onboard?: 0 | 1;
	hidden?: 0 | 1;
	idx?: number;
	icon?: string;
}

/** A Workspace shortcut entry. */
export interface WorkspaceShortcut {
	label?: string;
	link_to?: string;
	type?: 'DocType' | 'Report' | 'Dashboard' | 'Page' | string;
	color?: string;
	format?: string;
	stats_filter?: string;
}

/** A Workspace sidebar item (the new navigation model). */
export interface WorkspaceSidebarItem {
	label: string;
	icon?: string;
	link_to: string;
	link_type?: 'Workspace' | 'DocType' | 'Report' | 'Dashboard' | 'Page' | string;
	type?: 'Link' | 'Section Break' | string;
	child?: 0 | 1;
	indent?: number;
	collapsible?: 0 | 1;
	default_workspace?: 0 | 1;
	keep_closed?: 0 | 1;
	open_in_new_tab?: 0 | 1;
	show_arrow?: 0 | 1;
}

/** A decoded entry of a Workspace `content` JSON string. */
export interface WorkspaceContentBlock {
	id: string;
	type: 'header' | 'number_card' | 'chart' | 'shortcut' | 'card' | 'spacer' | 'onboarding' | string;
	data: {
		col?: number;
		text?: string;
		number_card_name?: string;
		chart_name?: string;
		shortcut_name?: string;
		card_name?: string;
		[label: string]: unknown;
	};
}

/** The Workspace doctype itself. */
export interface Workspace {
	name: string;
	label: string;
	module: string;
	icon?: string;
	indicator_color?: string;
	is_hidden?: 0 | 1;
	public?: 0 | 1;
	sequence_id?: number;
	for_user?: string;
	content: string; // JSON-encoded `WorkspaceContentBlock[]`
	links: WorkspaceLink[];
	charts: Array<{ chart_name?: string; label?: string }>;
	number_cards: Array<{ number_card_name?: string; label?: string }>;
	shortcuts: WorkspaceShortcut[];
	quick_lists?: unknown[];
	custom_blocks?: unknown[];
	sidebar_items?: WorkspaceSidebarItem[];
}

/** Generic Frappe error response. */
export interface FrappeError {
	/** HTTP status from the failed request. */
	httpStatus?: number;
	/** `exc_type` (e.g. `ValidationError`, `PermissionError`). */
	exc_type?: string;
	/** Top-level message, when Frappe sends one. */
	message?: string | { _server_messages?: string } | Record<string, unknown>;
	/** Raw traceback (dev mode). */
	exc?: string;
	/** Server-emitted JSON-string messages: `["...", "msg:0:blue", ...]`. */
	_server_messages?: string;
}
