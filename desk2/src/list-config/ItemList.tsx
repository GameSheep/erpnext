/**
 * Item — list-config.
 *
 * Ported from erpnext/stock/doctype/item/item.js (listview section).
 * Default filter: disabled = 0. Custom formatter for `item_name` + variant
 * indicator. Adds stock report shortcuts in the toolbar.
 */

import { register, type Indicator } from './registry';
import type { FrappeDoc } from '@/types/frappe';

register('Item', {
	addFields: ['item_name', 'item_group', 'stock_uom', 'disabled', 'has_variants', 'variant_of'],
	filters: [['Item', 'disabled', '=', 0]],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		if (doc.disabled === 1 || doc.disabled === '1') return ['Disabled', 'red', 'disabled,=,1'];
		if (doc.variant_of) return ['Variant', 'blue', 'variant_of,!=,'];
		if (doc.has_variants === 1 || doc.has_variants === '1') return ['Template', 'purple', 'has_variants,=,1'];
		return ['Active', 'green', 'disabled,=,0'];
	},
	reports: [
		{ name: 'Stock Summary', route: '/desk2/report/Stock%20Summary' },
		{ name: 'Stock Ledger', route: '/desk2/report/Stock%20Ledger' },
		{ name: 'Stock Balance', route: '/desk2/report/Stock%20Balance' },
	],
});
