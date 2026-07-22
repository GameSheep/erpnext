/**
 * Currency formatting — port of banking/src/lib/currency.ts.
 *
 * Currency metadata (symbol, position, precision) comes from the `Currency`
 * doctype, which Frappe preloads into `locals[':Currency'][code]`. In our SPA
 * we fetch it lazily via frappe.client.get_value and cache in a module map.
 */

import { flt, formatNumber, getNumberPrecision } from './numbers';

interface CurrencyMeta {
	symbol: string;
	symbol_on_right: 0 | 1;
	hide_currency_symbol: 0 | 1;
	fraction_units?: number;
	smallest_currency_fraction_value?: number;
	precision?: number;
}

const cache = new Map<string, CurrencyMeta | null>();

// Common ISO currency symbols used as a fallback when Frappe metadata is not
// yet loaded. Mirrors the boot-strapped `:Currency` table.
const BUILTIN_SYMBOLS: Record<string, string> = {
	USD: '$',
	EUR: '€',
	GBP: '£',
	JPY: '¥',
	CNY: '¥',
	RMB: '¥',
	INR: '₹',
	AUD: 'A$',
	CAD: 'C$',
	CHF: 'CHF',
	HKD: 'HK$',
	SGD: 'S$',
	RUB: '₽',
	BRL: 'R$',
	ZAR: 'R',
	MXN: '$',
	NZD: 'NZ$',
	SEK: 'kr',
	NOK: 'kr',
	DKK: 'kr',
	KRW: '₩',
	TRY: '₺',
	PLN: 'zł',
	THB: '฿',
	IDR: 'Rp',
	MYR: 'RM',
	PHP: '₱',
	VND: '₫',
};

function fallbackSymbol(code: string): string {
	return BUILTIN_SYMBOLS[code.toUpperCase()] ?? code + ' ';
}

/** Stash a currency's metadata so subsequent format calls skip the round-trip. */
export function setCurrencyMeta(code: string, meta: CurrencyMeta): void {
	cache.set(code, meta);
}

/** Format a number as a currency string per Frappe's `format_currency`. */
export function formatCurrency(
	value: number | string | null | undefined,
	currency?: string,
	decimals?: number,
): string {
	if (value === null || value === undefined || value === '') return '';
	const n = flt(value, decimals ?? getNumberPrecision());
	const formatted = formatNumber(n);

	if (!currency) return formatted;
	const meta = cache.get(currency);
	const symbol = meta && !meta.hide_currency_symbol ? meta.symbol : fallbackSymbol(currency);

	if (meta?.symbol_on_right) {
		return `${formatted} ${symbol}`;
	}
	return `${symbol} ${formatted}`;
}
