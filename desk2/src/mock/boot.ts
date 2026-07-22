/**
 * Mock boot payload — used in dev when no Frappe bench is reachable.
 *
 * Mirrors the shape of `frappe.sessions.get()` closely enough that the rest
 * of the app (which reads via getBoot() defensively) renders sensibly.
 */

import type { BootPayload } from '@/types/frappe';

export const MOCK_BOOT: BootPayload = {
	sitename: 'demo.localhost',
	user: {
		name: 'admin@demo.com',
		email: 'admin@demo.com',
		full_name: 'Demo Administrator',
		user_type: 'System User',
		language: 'en',
		time_zone: 'Asia/Shanghai',
		defaults: {
			Company: 'Demo Company',
			Currency: 'CNY',
			country: 'China',
		},
		can_read: ['Sales Invoice', 'Customer', 'Item', 'ToDo', 'Account', 'Item Group', 'Lead'],
		can_write: ['Sales Invoice', 'Customer', 'Item', 'ToDo', 'Account', 'Item Group', 'Lead'],
		can_create: ['Sales Invoice', 'Customer', 'Item', 'ToDo', 'Account', 'Item Group', 'Lead'],
		can_delete: ['Sales Invoice', 'Customer', 'Item', 'ToDo', 'Account', 'Item Group', 'Lead'],
		can_cancel: ['Sales Invoice'],
		can_amend: ['Sales Invoice'],
		can_export: ['Sales Invoice', 'Customer', 'Item', 'ToDo'],
		can_import: ['Sales Invoice', 'Customer', 'Item', 'ToDo'],
		can_print: ['Sales Invoice', 'Customer', 'Item'],
		can_email: ['Sales Invoice', 'Customer'],
		can_report: ['Sales Invoice', 'Customer', 'Item'],
		can_submit: ['Sales Invoice'],
		roles: ['Administrator', 'Accounts Manager', 'Sales Manager', 'Stock Manager'],
		employee: 'HR-EMP-00001',
		is_admin: true,
	},
	sysdefaults: {
		date_format: 'yyyy-mm-dd',
		time_format: 'HH:mm:ss',
		number_format: '#,###.##',
		float_precision: '2',
		currency_precision: '2',
		rounding_method: 'Commercial Rounding',
		first_day_of_the_week: 'Sunday',
		company: 'Demo Company',
		currency: 'CNY',
		country: 'China',
		language: 'en',
	},
	date_format: 'yyyy-mm-dd',
	time_format: 'HH:mm:ss',
	number_format: '#,###.##',
	float_precision: '2',
	currency_precision: '2',
	rounding_method: 'Commercial Rounding',
	desk_theme: 'Light',
	lang: 'en',
	translations_version: 'v1',
	time_zone: { system: 'UTC', user: 'Asia/Shanghai' },
	customer_count: 4,
	setup_complete: 'Yes',
	__messages: {},
	layout_direction: 'ltr',
};
