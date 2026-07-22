/**
 * Permission helpers — ported from banking/src/lib/permissions.ts.
 *
 * Frappe summarizes per-doctype CRUD permissions in `frappe.boot.user` as
 * arrays of doctype names (`can_create`, `can_read`, …). These helpers wrap
 * the lookups. Field-level (permlevel) and role-level checks still require the
 * doctype's `permissions` array + the user's `roles`.
 */

import type { BootUser, DocMeta, DocPerm } from '@/types/frappe';
import { getBoot } from './frappe';

function user(): BootUser | undefined {
	return getBoot()?.user;
}

function arrayHas(arr: string[] | undefined, doctype: string): boolean {
	return !!arr && arr.includes(doctype);
}

export function canCreate(doctype: string): boolean {
	return arrayHas(user()?.can_create, doctype);
}
export function canRead(doctype: string): boolean {
	return arrayHas(user()?.can_read, doctype);
}
export function canWrite(doctype: string): boolean {
	return arrayHas(user()?.can_write, doctype);
}
export function canDelete(doctype: string): boolean {
	return arrayHas(user()?.can_delete, doctype);
}
export function canSubmit(doctype: string): boolean {
	return arrayHas(user()?.can_submit, doctype);
}
export function canCancel(doctype: string): boolean {
	return arrayHas(user()?.can_cancel, doctype);
}
export function canAmend(doctype: string): boolean {
	return arrayHas(user()?.can_amend, doctype);
}
export function canExport(doctype: string): boolean {
	return arrayHas(user()?.can_export, doctype);
}
export function canImport(doctype: string): boolean {
	return arrayHas(user()?.can_import, doctype);
}
export function canPrint(doctype: string): boolean {
	return arrayHas(user()?.can_print, doctype);
}
export function canEmail(doctype: string): boolean {
	return arrayHas(user()?.can_email, doctype);
}
export function canReport(doctype: string): boolean {
	return arrayHas(user()?.can_report, doctype);
}

/** True when the user has the given Role. */
export function hasRole(role: string): boolean {
	return !!user()?.roles?.includes(role);
}

/** True when the user is the all-powerful Administrator. */
export function isAdmin(): boolean {
	return user?.name === 'Administrator' || !!user()?.is_admin;
}

/**
 * Compute the highest effective permission flags for a doctype based on the
 * roles in `meta.permissions` that the user actually holds. Used by the form
 * action bar (Save/Submit/Cancel visibility).
 */
export function getDoctypePermissions(meta: DocMeta, user: BootUser | undefined): {
	read: boolean;
	write: boolean;
	create: boolean;
	delete: boolean;
	submit: boolean;
	cancel: boolean;
	amend: boolean;
	print: boolean;
	email: boolean;
} {
	if (!user) {
		return {
			read: false,
			write: false,
			create: false,
			delete: false,
			submit: false,
			cancel: false,
			amend: false,
			print: false,
			email: false,
		};
	}
	if (user.name === 'Administrator') {
		return {
			read: true,
			write: true,
			create: true,
			delete: true,
			submit: true,
			cancel: true,
			amend: true,
			print: true,
			email: true,
		};
	}
	const roles = new Set(user.roles ?? []);
	const perms = (meta.permissions ?? []).filter((p: DocPerm) => roles.has(p.role));
	const any = (key: keyof DocPerm): boolean => perms.some((p) => p[key] === 1);
	return {
		read: any('read'),
		write: any('write'),
		create: any('create'),
		delete: any('delete'),
		submit: any('submit'),
		cancel: any('cancel'),
		amend: any('amend'),
		print: any('print'),
		email: any('email'),
	};
}
