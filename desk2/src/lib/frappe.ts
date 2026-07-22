/**
 * Safe access to the `window.frappe` global populated by index.html.
 *
 * Ported from banking/src/lib/frappe.ts. Defensive reads throughout: the boot
 * payload shape drifts across Frappe versions, so we never assume a key exists.
 */

import type { BootPayload, FrappeError } from '@/types/frappe';

/** The boot payload injected by erpnext/www/desk2.py. */
export function getBoot(): BootPayload | undefined {
	return window.frappe?.boot;
}

/** A single sysdefault (e.g. `date_format`, `currency_precision`). */
export function getSystemDefault<T = string>(key: string): T | undefined {
	const boot = getBoot();
	const value = boot?.sysdefaults?.[key as keyof typeof boot.sysdefaults];
	return value as T | undefined;
}

/** A per-user default (Company, Currency, etc.). */
export function getUserDefault<T = string>(key: string): T | undefined {
	const value = getBoot()?.user?.defaults?.[key as string];
	return value as T | undefined;
}

/** Convenience: pull any top-level key off boot with a fallback. */
export function getBootFieldData<T = unknown>(key: string): T | undefined {
	return getBoot()?.[key as keyof BootPayload] as T | undefined;
}

/** Logged-in user object, or undefined when not authenticated. */
export function getCurrentUser() {
	const user = getBoot()?.user;
	if (!user || user.name === 'Guest') return undefined;
	return user;
}

/** True when the cookie check would consider this session authenticated. */
export function isLoggedIn(): boolean {
	const userId = document.cookie
		?.split('; ')
		.find((row) => row.startsWith('user_id='))
		?.split('=')[1]
		?.trim();
	return !!userId && userId !== 'Guest';
}

/** Frappe `scrub("Sales Invoice")` → `sales_invoice`. */
export function scrub(s: string): string {
	return s.trim().replace(/ /g, '_').replace(/-/g, '_').toLowerCase();
}

/** Frappe `unscrub("sales_invoice")` → `Sales Invoice`. */
export function unscrub(s: string): string {
	return s.replace(/_+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Frappe's URL slug for routes: `Sales Invoice` → `sales-invoice`.
 * Used for `/desk/<doctype>/new-...` deep links.
 */
export function slug(s: string): string {
	return s.trim().replace(/ /g, '-').replace(/[^\w-]/g, '').toLowerCase();
}

/**
 * Parse Frappe's nested-JSON `_server_messages` array into readable strings.
 * Each entry is either a JSON-encoded `{message, title, indicator}` object or
 * a plain string.
 */
export function parseServerMessages(raw: string | undefined): string[] {
	if (!raw) return [];
	let arr: unknown;
	try {
		arr = JSON.parse(raw);
	} catch {
		return [raw];
	}
	if (!Array.isArray(arr)) return [];
	return arr
		.map((entry) => {
			if (typeof entry === 'string') {
				try {
					const parsed = JSON.parse(entry) as { message?: unknown };
					return typeof parsed.message === 'string' ? parsed.message : entry;
				} catch {
					return entry;
				}
			}
			return String(entry);
		})
		.filter(Boolean);
}

/**
 * Extract a human-readable error message from a frappe-react-sdk / fetch error.
 * Handles the nested `message._server_messages` shape Frappe uses.
 */
export function getErrorMessage(err: unknown): string {
	if (!err) return '';
	const e = err as FrappeError;
	if (typeof e.message === 'string' && e.message) return e.message;
	const msgObj = e.message as { _server_messages?: string } | undefined;
	if (msgObj && typeof msgObj === 'object' && msgObj._server_messages) {
		const parsed = parseServerMessages(msgObj._server_messages);
		if (parsed.length) return parsed.join('\n');
	}
	if (e._server_messages) {
		const parsed = parseServerMessages(e._server_messages);
		if (parsed.length) return parsed.join('\n');
	}
	if (e.exc_type) return e.exc_type;
	if (e.message && typeof e.message === 'object') {
		try {
			return JSON.stringify(e.message);
		} catch {
			/* ignore */
		}
	}
	return 'Something went wrong';
}
