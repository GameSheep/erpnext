/**
 * Basic value fields: text, number, select, date/time, check, etc.
 *
 * Each component takes a normalized "field props" shape (see FieldProps) so the
 * FieldRenderer can hand them off uniformly. The components themselves stay
 * thin — they translate Frappe field semantics onto antd controls.
 */

import {
	AutoComplete,
	Checkbox,
	ColorPicker,
	Input,
	InputNumber,
	type InputNumberProps,
	type InputProps,
	InputRef,
	Radio,
	Select,
	TimePicker,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';

import { LinkPicker } from '@/components/common/LinkPicker';
import { flt, getNumberPrecision } from '@/lib/numbers';
import { getUserDateFormat } from '@/lib/date';
import type { DocField } from '@/types/frappe';

export interface FieldProps {
	df: DocField;
	value: unknown;
	onChange: (v: unknown) => void;
	disabled?: boolean;
	readOnly?: boolean;
	placeholder?: string;
	size?: 'small' | 'middle' | 'large';
	/** For Link fields: server-side filters. */
	linkFilters?: Record<string, unknown>;
	/** For Link fields: reference doctype (the parent). */
	referenceDoctype?: string;
	autoFocus?: boolean;
}

// ---------- Text fields ----------

function optionsToInputMode(options?: string): InputProps['inputMode'] | undefined {
	switch (options) {
		case 'Email':
			return 'email';
		case 'Phone':
			return 'tel';
		case 'URL':
			return 'url';
		default:
			return undefined;
	}
}

export function DataField({ df, value, onChange, disabled, placeholder, size, autoFocus }: FieldProps) {
	const isPassword = df.fieldname === 'password' || df.options === 'Password';
	return (
		<Input
			value={value as string}
			onChange={(e) => onChange(e.target.value)}
			disabled={disabled}
			placeholder={placeholder ?? df.label}
			size={size}
			inputMode={optionsToInputMode(df.options)}
			autoFocus={autoFocus}
			type={isPassword ? 'password' : undefined}
			maxLength={df.length}
		/>
	);
}

export function TextField({ df, value, onChange, disabled, placeholder, autoFocus }: FieldProps) {
	return (
		<Input.TextArea
			value={value as string}
			onChange={(e) => onChange(e.target.value)}
			disabled={disabled}
			placeholder={placeholder ?? df.label}
			rows={2}
			autoSize={{ minRows: 1, maxRows: 6 }}
			autoFocus={autoFocus}
			maxLength={df.length}
		/>
	);
}

export function SmallTextField(props: FieldProps) {
	return <TextField {...props} />;
}

export function LongTextField(props: FieldProps) {
	return <Input.TextArea {...props} value={props.value as string} rows={5} />;
}

export function PasswordField(props: FieldProps) {
	return <Input.Password {...props} value={props.value as string} />;
}

// ---------- Numbers ----------

interface NumberFieldProps extends FieldProps {
	numberProps?: Partial<InputNumberProps>;
}

function BaseNumberField({
	df,
	value,
	onChange,
	disabled,
	placeholder,
	size,
	numberProps,
}: NumberFieldProps) {
	const precision = df.precision ?? getNumberPrecision();
	return (
		<InputNumber
			value={typeof value === 'number' ? value : value === '' || value == null ? null : Number(value)}
			onChange={(v) => onChange(v ?? 0)}
			disabled={disabled}
			placeholder={placeholder ?? df.label}
			size={size}
			precision={precision}
			style={{ width: '100%' }}
			formatter={(v) => (v == null ? '' : String(v))}
			{...numberProps}
		/>
	);
}

export function IntField({ df, value, onChange, disabled, placeholder, size }: FieldProps) {
	return (
		<InputNumber
			value={typeof value === 'number' ? value : value === '' || value == null ? null : Number(value)}
			onChange={(v) => onChange(v ?? 0)}
			disabled={disabled}
			placeholder={placeholder ?? df.label}
			size={size}
			precision={0}
			step={1}
			style={{ width: '100%' }}
		/>
	);
}

export function FloatField(props: FieldProps) {
	return <BaseNumberField {...props} />;
}

export function CurrencyField(props: FieldProps) {
	return <BaseNumberField {...props} numberProps={{ step: 0.01 }} />;
}

export function PercentField({ value, onChange, ...rest }: FieldProps) {
	return (
		<InputNumber
			value={typeof value === 'number' ? value : value === '' || value == null ? null : Number(value)}
			onChange={(v) => onChange(v ?? 0)}
			formatter={(v) => (v == null ? '' : `${v}%`)}
			parser={(s) => Number((s ?? '').replace('%', '').trim()) as 0}
			style={{ width: '100%' }}
			{...rest}
		/>
	);
}

// ---------- Check ----------

export function CheckField({ value, onChange, disabled, df }: FieldProps) {
	const checked = value === 1 || value === true || value === '1';
	return (
		<Checkbox
			checked={checked}
			disabled={disabled}
			onChange={(e) => onChange(e.target.checked ? 1 : 0)}
		>
			{df.label}
		</Checkbox>
	);
}

// ---------- Select / Autocomplete ----------

function parseSelectOptions(options?: string): Array<{ label: string; value: string }> {
	if (!options) return [];
	// Frappe Select options are newline-separated. Some entries are "\n\tYes\nNo\n\tMaybe".
	return options
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => {
			// Allow `[value]Label` syntax for value/label split.
			const m = s.match(/^\[([^\]]+)\](.*)$/);
			if (m) return { value: m[1].trim(), label: (m[2] || m[1]).trim() };
			return { value: s, label: s };
		});
}

export function SelectField({ df, value, onChange, disabled, placeholder, size }: FieldProps) {
	const options = parseSelectOptions(df.options);
	// Handle `{value,label}` style options from Frappe dynamic selects.
	const opts = options.map((o) => ({ label: o.label, value: o.value }));
	return (
		<Select
			value={value as string}
			onChange={(v) => onChange(v)}
			disabled={disabled}
			placeholder={placeholder ?? `Select ${df.label ?? ''}`.trim()}
			size={size}
			options={opts}
			showSearch
			optionFilterProp="label"
			allowClear
			style={{ width: '100%' }}
		/>
	);
}

export function AutocompleteField({ df, value, onChange, disabled, placeholder, size }: FieldProps) {
	// Frappe Autocomplete options can be newline-list (static) or a server fn.
	const opts = parseSelectOptions(df.options);
	const [text, setText] = useState('');
	return (
		<AutoComplete
			value={(value as string) ?? text}
			options={opts.map((o) => ({ value: o.value, label: o.label }))}
			onSearch={setText}
			onSelect={(v) => onChange(v)}
			onChange={(v) => onChange(v)}
			disabled={disabled}
			placeholder={placeholder ?? df.label}
			size={size}
			style={{ width: '100%' }}
			filterOption={(input, option) =>
				(option?.label as string | undefined)?.toLowerCase().includes(input.toLowerCase()) ?? false
			}
		/>
	);
}

// ---------- Link / Dynamic Link ----------

export function LinkField({ df, value, onChange, disabled, size, linkFilters, referenceDoctype }: FieldProps) {
	return (
		<LinkPicker
			doctype={df.options ?? ''}
			value={value as string | undefined}
			onChange={(v) => onChange(v)}
			disabled={disabled}
			filters={linkFilters}
			referenceDoctype={referenceDoctype}
			size={size}
		/>
	);
}

export function DynamicLinkField({
	df,
	value,
	onChange,
	disabled,
	size,
	linkFilters,
	referenceDoctype,
}: FieldProps & { doctypeValue?: string }) {
	// Dynamic Link: the target doctype is held in another field whose name is
	// `df.options`. The caller must pass that resolved doctype via `df.options`
	// override OR we read it from the form. FieldRenderer injects it.
	const targetDoctype = (df.options as string) || '';
	if (!targetDoctype) {
		return <Input disabled value="Select a type first" />;
	}
	return (
		<LinkPicker
			doctype={targetDoctype}
			value={value as string | undefined}
			onChange={(v) => onChange(v)}
			disabled={disabled}
			filters={linkFilters}
			referenceDoctype={referenceDoctype}
			size={size}
		/>
	);
}

// ---------- Date / Datetime / Time ----------

export function DateField({ df, value, onChange, disabled, placeholder, size }: FieldProps) {
	const fmt = getUserDateFormat();
	const dayjsFmt = fmt.replace(/y/g, 'Y').replace(/d/g, 'D');
	void df;
	const parsed = value ? dayjs(String(value)) : null;
	return (
		<AntDatePicker
			value={parsed}
			format={dayjsFmt}
			onChange={(d) => onChange(d ? d.format('YYYY-MM-DD') : undefined)}
			disabled={disabled}
			placeholder={placeholder}
			size={size}
			style={{ width: '100%' }}
		/>
	);
}

// antd's DatePicker needs locale + dayjs integration which we set up in main.tsx.
import { DatePicker as AntDatePicker } from 'antd';

export function DatetimeField(props: FieldProps) {
	const value = props.value ? dayjs(String(props.value)) : null;
	const fmt = getUserDateFormat().replace(/y/g, 'Y').replace(/d/g, 'D');
	return (
		<AntDatePicker
			showTime
			value={value}
			format={`${fmt} HH:mm:ss`}
			onChange={(d) => props.onChange(d ? d.format('YYYY-MM-DD HH:mm:ss') : undefined)}
			disabled={props.disabled}
			placeholder={props.placeholder}
			size={props.size}
			style={{ width: '100%' }}
		/>
	);
}

export function TimeField({ value, onChange, disabled, size }: FieldProps) {
	const parsed = value ? dayjs(String(value), 'HH:mm:ss') : null;
	return (
		<TimePicker
			value={parsed}
			onChange={(t) => onChange(t ? t.format('HH:mm:ss') : undefined)}
			disabled={disabled}
			size={size}
			style={{ width: '100%' }}
		/>
	);
}

// ---------- Color ----------

export function ColorField({ value, onChange, disabled }: FieldProps) {
	const colorStr = (value as string) || '#000000';
	return (
		<ColorPicker
			value={colorStr}
			onChange={(c) => onChange(c.toHexString())}
			disabled={disabled}
		>
			<Input value={colorStr} disabled={disabled} style={{ width: 120 }} />
		</ColorPicker>
	);
}

// ---------- Radio group (rare but used) ----------

export function RadioField({ df, value, onChange, disabled }: FieldProps) {
	const opts = parseSelectOptions(df.options);
	return (
		<Radio.Group
			value={value as string}
			onChange={(e) => onChange(e.target.value)}
			disabled={disabled}
		>
			{opts.map((o) => (
				<Radio key={o.value} value={o.value}>
					{o.label}
				</Radio>
			))}
		</Radio.Group>
	);
}

// ---------- Barcode display ----------

export function BarcodeField({ value, onChange, disabled, placeholder, size }: FieldProps) {
	const ref = useRef<InputRef>(null);
	useEffect(() => {
		// Auto-focus so USB scanners can fire into the field.
		if (!disabled) ref.current?.focus();
	}, [disabled]);
	return (
		<Input
			ref={ref}
			value={value as string}
			onChange={(e) => onChange(e.target.value)}
			disabled={disabled}
			placeholder={placeholder ?? 'Scan or type barcode'}
			size={size}
		/>
	);
}

// Re-export `flt` so TS considers it used (it's a common helper for callers).
export { flt };
