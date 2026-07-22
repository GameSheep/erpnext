/**
 * Number formatting — ports of banking/src/lib/numbers.ts (which themselves
 * port Frappe's JS `flt`, `format_number`, `cint`).
 *
 * Frappe's number format is a sysdefault like `#,###.##` (US) or `#,##,###.##`
 * (Indian grouping). Rounding method (`Banker's Rounding` etc.) also lives in
 * sysdefaults.
 */

import { getBoot, getSystemDefault } from './frappe';

/** Coerce anything to an integer, Frappe-style. */
export function cint(v: unknown, def = 0): number {
	if (v === null || v === undefined || v === '') return def;
	const n = typeof v === 'string' ? parseFloat(v) : Number(v);
	return Number.isFinite(n) ? Math.trunc(n) : def;
}

/** Coerce anything to a float with optional precision. */
export function flt(v: unknown, precision?: number, roundingMethod?: string): number {
	if (v === null || v === undefined || v === '') return 0;
	const n = typeof v === 'string' ? parseFloat(v) : Number(v);
	if (!Number.isFinite(n)) return 0;

	const decimals = precision ?? getNumberPrecision();
	const rm = roundingMethod ?? getRoundingMethod();
	return round(n, decimals, rm);
}

/** Apply a specific rounding method. Frappe supports three. */
export function round(n: number, decimals: number, method?: string): number {
	const factor = 10 ** decimals;
	if (method === "Banker's Rounding") {
		// Round-half-to-even (matches Python's `decimal` default).
		const scaled = n * factor;
		const floor = Math.floor(scaled);
		const diff = scaled - floor;
		if (diff > 0.5) return (floor + 1) / factor;
		if (diff < 0.5) return floor / factor;
		// Exactly 0.5: round to even.
		return (floor % 2 === 0 ? floor : floor + 1) / factor;
	}
	// "Commercial Rounding" / default = round-half-up.
	const scaled = n * factor;
	const rounded = Math.round(scaled);
	return rounded / factor;
}

/** The configured number of decimal places (float_precision / currency_precision). */
export function getNumberPrecision(fieldPrecision?: number): number {
	if (typeof fieldPrecision === 'number' && fieldPrecision >= 0) return fieldPrecision;
	const sys = getSystemDefault<number | string>('float_precision');
	const parsed = typeof sys === 'string' ? parseFloat(sys) : sys;
	if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed;
	return 2;
}

export function getRoundingMethod(): string {
	return getSystemDefault<string>('rounding_method') ?? 'Commercial Rounding';
}

/** Resolve the number-format pattern (`#,###.##` or `#,##,###.##`). */
export function getNumberFormat(): string {
	return getBoot()?.number_format ?? (getSystemDefault<string>('number_format') ?? '#,###.##');
}

/**
 * Format a number per Frappe's `format_number`.
 * Handles the Indian `#,##,###.##` grouping and configurable separators.
 */
export function formatNumber(value: number | string | null | undefined, format?: string): string {
	if (value === null || value === undefined || value === '') return '';
	const n = typeof value === 'string' ? parseFloat(value) : value;
	if (!Number.isFinite(n)) return '';

	const fmt = format ?? getNumberFormat();
	const indian = fmt.includes('#,##,###');
	const decimals = (fmt.split('.')[1] ?? '').length;
	const rounded = round(Math.abs(n), decimals, getRoundingMethod());

	const [intPartRaw, fracPartRaw] = rounded.toFixed(decimals).split('.');
	const sep = fmt.includes(';') ? ';' : '';
	const decimalSep = fmt.replace(/#/g, '').replace(/,/g, '').charAt(0) || '.';
	let intPart = intPartRaw;
	if (indian) {
		intPart = intPart.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
		// Indian grouping: rightmost group of 3, then groups of 2.
		intPart = intPart.replace(/,(\d+),(\d{3})$/, ',$1$2');
	} else {
		intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	}

	let out = intPart;
	if (decimals > 0) {
		out += (decimalSep === '.' ? '.' : decimalSep) + (fracPartRaw ?? '');
	}
	if (n < 0) out = '-' + out;
	return sep ? out + sep : out;
}
