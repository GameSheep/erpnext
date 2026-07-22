/**
 * Date helpers — dayjs-backed ports of banking/src/lib/date.ts.
 *
 * The user's date format and timezone come from `frappe.boot`:
 *   - `boot.sysdefaults.date_format` (e.g. `dd-mm-yyyy`)
 *   - `boot.time_zone.user` / `boot.time_zone.system`
 *
 * Frappe uses dayjs internally; we keep the same plugin set for parity.
 */

import dayjs, { type Dayjs } from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import duration from 'dayjs/plugin/duration';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import weekday from 'dayjs/plugin/weekday';

import { getBoot, getSystemDefault, getUserDefault } from './frappe';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(dayOfYear);
dayjs.extend(duration);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);
dayjs.extend(relativeTime);
dayjs.extend(weekOfYear);
dayjs.extend(weekday);

export { dayjs, type Dayjs };

/** Map Frappe's `dd-mm-yyyy` token format to a dayjs format string. */
function mapFormat(fmt: string | undefined): string {
	if (!fmt) return 'DD-MM-YYYY';
	// Frappe uses PHP-style lowercase tokens (mostly compatible with dayjs).
	// Only two real divergences in practice: `Y` (4-digit) — dayjs uses `YYYY`.
	// Replace standalone `Y` with `YYYY`, lowercase stays the same.
	return fmt.replace(/\bY\b/g, 'YYYY').replace(/Y{1,3}(?![Y])/g, 'YYYY');
}

/** The user's date format (e.g. `dd-mm-yyyy`). */
export function getUserDateFormat(): string {
	const user = getUserDefault<string>('date_format');
	const sys = getSystemDefault<string>('date_format');
	const boot = getBoot()?.date_format;
	return user ?? sys ?? boot ?? 'dd-mm-yyyy';
}

/** The user's time format (e.g. `HH:mm:ss`). */
export function getUserTimeFormat(): string {
	const user = getUserDefault<string>('time_format');
	const sys = getSystemDefault<string>('time_format');
	return user ?? sys ?? 'HH:mm:ss';
}

/** Format a Date / string / Dayjs using the user's date format. */
export function formatDate(value: Date | string | Dayjs | null | undefined, format?: string): string {
	if (!value) return '';
	const fmt = mapFormat(format ?? getUserDateFormat());
	return dayjs(value).format(fmt);
}

/** Format a datetime using the user's date + time format. */
export function formatDatetime(value: Date | string | Dayjs | null | undefined): string {
	if (!value) return '';
	return dayjs(value).format(`${mapFormat(getUserDateFormat())} ${getUserTimeFormat()}`);
}

/** Today's date in `YYYY-MM-DD` (server-canonical). */
export function today(): string {
	return dayjs().format('YYYY-MM-DD');
}

/** Now in `YYYY-MM-DD HH:mm:ss` (server-canonical). */
export function nowDatetime(): string {
	return dayjs().format('YYYY-MM-DD HH:mm:ss');
}

/** Friendly "2 hours ago"-style relative time. */
export function getTimeago(value: Date | string | Dayjs): string {
	return dayjs(value).fromNow();
}

/** Convert a UTC server datetime to the user's timezone for display. */
export function toUserTZ(value: string | Date): Dayjs {
	const tz = getBoot()?.time_zone?.user;
	return tz ? dayjs(value).tz(tz) : dayjs(value);
}
