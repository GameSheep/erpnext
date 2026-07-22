/**
 * Customer — list-config.
 *
 * Ported from erpnext/selling/doctype/customer/customer.js (listview section).
 * Default filter: disabled = 0. Status indicator: active vs disabled.
 */

import { register, type Indicator } from './registry';
import type { FrappeDoc } from '@/types/frappe';

register('Customer', {
	addFields: ['customer_name', 'customer_group', 'territory', 'disabled'],
	filters: [['Customer', 'disabled', '=', 0]],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		if (doc.disabled === 1 || doc.disabled === '1') return ['Disabled', 'red', 'disabled,=,1'];
		return ['Active', 'green', 'disabled,=,0'];
	},
});
