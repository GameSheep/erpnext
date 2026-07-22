/**
 * ToDo — list-config.
 *
 * Ported from frappe's core ToDo list (no erpnext override). Default filter
 * hides closed ToDos. Status indicator by priority + status.
 */

import { register, type Indicator } from './registry';
import type { FrappeDoc } from '@/types/frappe';

register('ToDo', {
	filters: [['ToDo', 'status', '!=', 'Closed']],
	getIndicator: (doc: FrappeDoc): Indicator | undefined => {
		const status = doc.status as string;
		if (status === 'Closed') return ['Closed', 'gray', 'status,=,Closed'];
		if (status === 'Cancelled') return ['Cancelled', 'red', 'status,=,Cancelled'];
		const priority = doc.priority as string;
		const color = priority === 'High' ? 'red' : priority === 'Medium' ? 'orange' : 'blue';
		return ['Open', color, 'status,=,Open'];
	},
});
