/**
 * Item — form-config.
 *
 * Ported from erpnext/stock/doctype/item/item.js. The original toggles
 * serial/batch fields based on `has_serial_no` / `has_batch_no` and adds
 * stock-summary quick links.
 *
 * In stage 1 we register stock-report quick actions via customButtons; the
 * field-toggle is handled generically by the depends_on expressions in the
 * doctype JSON.
 */

import { register, type FormConfig } from './registry';

const config: FormConfig = {
	customButtons: [
		{
			label: 'Stock Ledger',
			variant: 'link',
			show: (doc) => !doc.__islocal,
			onClick: (form) => {
				const code = form.state.doc.name;
				window.location.href = `/desk2/report/Stock%20Ledger?item_code=${encodeURIComponent(String(code))}`;
			},
		},
		{
			label: 'Stock Balance',
			variant: 'link',
			show: (doc) => !doc.__islocal,
			onClick: (form) => {
				const code = form.state.doc.name;
				window.location.href = `/desk2/report/Stock%20Balance?item_code=${encodeURIComponent(String(code))}`;
			},
		},
	],
};

register('Item', config);
