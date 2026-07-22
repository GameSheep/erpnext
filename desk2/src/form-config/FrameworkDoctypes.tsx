/**
 * Framework doctype overrides — the 5 doctypes ERPNext customizes via
 * hooks.py `doctype_js` (Address / Communication / Event / Newsletter / Contact).
 *
 * These are framework-owned doctypes (in Frappe, not ERPNext) that ERPNext
 * extends with ERP-specific behaviour. We register minimal form-config for
 * each so the custom UI surfaces (make buttons, link filters) are present.
 */

import { register } from './registry';

// ---------- Address ----------
// Original: toggles "is_your_company_address", adds Company link row.
register('Address', {
	customButtons: [
		{
			label: 'View on Map',
			variant: 'link',
			show: (doc) => !doc.__islocal,
			onClick: () => {
				// In a full impl: open Google Maps with the address.
				window.open('https://maps.google.com', '_blank');
			},
		},
	],
});

// ---------- Communication ----------
// Original: "Make" buttons for converting received emails into other docs.
register('Communication', {
	customButtons: [
		{
			label: 'Create ToDo',
			group: 'Create',
			show: (doc) => !doc.__islocal && doc.communication_type === 'Communication',
			onClick: (form) => {
				void form;
				// Backend: frappe.core.doctype.communication.communication.make_todo
			},
		},
		{
			label: 'Create Issue',
			group: 'Create',
			show: (doc) => !doc.__islocal,
			onClick: () => {},
		},
	],
});

// ---------- Event ----------
// Original: restricts reference_doctype to a fixed list.
register('Event', {
	linkFilters: undefined,
});

// ---------- Newsletter ----------
// Original: toggles naming series.
register('Newsletter', {});

// ---------- Contact ----------
// Original: sets up link_doctype query for dynamic links.
register('Contact', {
	customButtons: [
		{
			label: 'Send Email',
			variant: 'primary',
			show: (doc) => !doc.__islocal && !!doc.email_id,
			onClick: () => {},
		},
	],
});
