/**
 * Translation helper — reads the message catalog `window.frappe._messages`
 * populated by `frappe.translate.get_boot_translations` (loaded in index.html).
 *
 * Mirrors banking/src/lib/translate.ts.
 */

/** The catalog, lazily resolved from window.frappe._messages. */
function getCatalog(): Record<string, string> {
	return window.frappe?._messages ?? {};
}

/**
 * Translate a key. Supports `{0}`, `{name}` positional/named interpolation:
 *   `_("Welcome, {0}", ["John"])` → "Welcome, John"
 *   `_("Welcome, {user}", [null, { user: "John" }])` → "Welcome, John"
 */
export function _(key: string, params?: unknown[], named?: Record<string, unknown>): string {
	const catalog = getCatalog();
	let msg = catalog[key] ?? key;
	if (params?.length) {
		msg = msg.replace(/\{(\d+)\}/g, (_, i: string) => String(params[Number(i)] ?? ''));
	}
	if (named) {
		msg = msg.replace(/\{(\w+)\}/g, (_, name: string) => String(named[name] ?? ''));
	}
	return msg;
}

export default _;
