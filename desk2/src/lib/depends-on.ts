/**
 * Safe evaluator for Frappe's `depends_on` / `mandatory_depends_on` /
 * `read_only_depends_on` / `collapsible_depends_on` expressions.
 *
 * Frappe doctype JSONs embed arbitrary JS expressions like
 * `eval: !doc.is_debit_note` or the shorthand `customer` (truthy). They run
 * client-side against the live doc. In our rewrite we MUST NOT use raw `eval`
 * (XSS via doctype metadata + arbitrary boot data). Instead we compile with
 * `Function` in a sandboxed scope that exposes only `doc`, `frm` (a tiny
 * read-only view), and Frappe's `in_list` / `date_diff` helpers.
 *
 * Anything that smells like a side-effect (`window`, `document`, `fetch`,
 * `XMLHttpRequest`, `eval`, `while`, `import`, `setTimeout`, …) is rejected.
 */

const FORBIDDEN = /\b(window|document|globalThis|self|top|parent|frames|fetch|XMLHttpRequest|localStorage|sessionStorage|navigator|location|eval|Function|setTimeout|setInterval|setImmediate|process|require|import|while|for\s*\(|delete\s|void\s+0|constructor|__proto__|prototype)\b/;

/** A read-only view of the form passed to depends_on expressions. */
export interface DependsContext {
	/** The current document (raw values, possibly unsaved). */
	doc: Record<string, unknown>;
	/** A minimal `frm` proxy: just what expressions commonly read. */
	frm?: {
		doc?: Record<string, unknown>;
		[key: string]: unknown;
	};
}

const cache = new Map<string, ((ctx: DependsContext) => unknown) | null>();

function compile(expr: string): ((ctx: DependsContext) => unknown) | null {
	const cached = cache.get(expr);
	if (cached !== undefined) return cached;
	if (FORBIDDEN.test(expr)) {
		cache.set(expr, null);
		return null;
	}
	try {
		// Strip the `eval:` / `eval ` prefix Frappe allows.
		const body = expr.replace(/^eval\s*:?/, '').trim();
		if (!body) {
			const fn = () => true;
			cache.set(expr, fn);
			return fn;
		}
		// `in_list(field, ...values)` helper (Frappe doctype expressions use it).
		const inList = (value: unknown, ...values: unknown[]) => values.includes(value);
		// `date_diff(a, b)` returns days between two date strings.
		const dateDiff = (a: string, b: string) => {
			const ms = Date.parse(a) - Date.parse(b);
			return Math.round(ms / 86_400_000);
		};
		// eslint-disable-next-line no-new-func
		const fn = new Function(
			'doc',
			'frm',
			'in_list',
			'date_diff',
			`"use strict"; return (${body});`,
		) as (doc: unknown, frm: unknown, inList: unknown, dateDiff: unknown) => unknown;
		const wrapped = (ctx: DependsContext) =>
			fn(ctx.doc, ctx.frm ?? { doc: ctx.doc }, inList, dateDiff);
		cache.set(expr, wrapped);
		return wrapped;
	} catch {
		cache.set(expr, null);
		return null;
	}
}

/**
 * Evaluate a depends_on expression to a boolean. Returns true when the
 * expression is empty or unparseable (i.e. field is visible/mandatory by default).
 */
export function evalDependsOn(expr: string | undefined, ctx: DependsContext): boolean {
	if (!expr) return true;
	const fn = compile(expr);
	if (!fn) return true;
	try {
		return Boolean(fn(ctx));
	} catch {
		return true;
	}
}

/** Evaluate to a value (not coerced) — useful when the expression returns a string. */
export function evalExpr(expr: string, ctx: DependsContext): unknown {
	const fn = compile(expr);
	if (!fn) return undefined;
	try {
		return fn(ctx);
	} catch {
		return undefined;
	}
}
