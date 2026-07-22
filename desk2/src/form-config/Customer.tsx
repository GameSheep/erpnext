/**
 * Customer — form-config.
 *
 * Ported from erpnext/selling/doctype/customer/customer.js.
 * The original adds a "Get Customer Group Details" button and wires
 * `frm.add_fetch("lead_name", "company_name", "customer_name")` for the
 * Lead→Customer conversion flow.
 *
 * In stage 1 we keep the config minimal — just the custom button. Fetch-from
 * field logic is handled generically by the form engine (which calls the
 * backend fetch endpoint).
 */

import { register, type FormConfig } from './registry';

const config: FormConfig = {
	customButtons: [
		{
			label: 'View Ledger',
			variant: 'link',
			show: (doc) => !doc.__islocal && doc.docstatus === undefined,
			onClick: (form) => {
				const name = form.state.doc.name;
				window.location.href = `/desk2/report/General%20Ledger?party=${encodeURIComponent(String(name))}&party_type=Customer`;
			},
		},
	],
};

register('Customer', config);
