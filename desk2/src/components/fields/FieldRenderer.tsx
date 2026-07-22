/**
 * FieldRenderer — the single dispatch component that maps a DocField to the
 * right antd control.
 *
 * Usage:
 *   <FieldRenderer df={docfield} />
 *
 * Inside a <FormProvider>, the renderer subscribes to that field's value and
 * to runtime df property overrides, and wires its onChange to dispatch a
 * SET_VALUE (which triggers depends_on re-evaluation + controller events).
 *
 * For layout fieldtypes (Section/Column/Tab Break) the renderer renders
 * nothing — those are handled by the FormLayout component that owns the
 * 2D section/column grid.
 */

import { Form, type FormItemProps } from 'antd';
import { useMemo } from 'react';

import { useForm, useFieldValue } from '@/components/form/FormContext';
import type { DocField, FieldType } from '@/types/frappe';
import { evalDependsOn } from '@/lib/depends-on';

import {
	AutocompleteField,
	BarcodeField,
	CheckField,
	ColorField,
	CurrencyField,
	DataField,
	DateField,
	DatetimeField,
	DynamicLinkField,
	FloatField,
	IntField,
	LinkField,
	LongTextField,
	PasswordField,
	PercentField,
	SelectField,
	SmallTextField,
	TextField,
	TimeField,
	type FieldProps,
} from './BasicFields';
import {
	AttachField,
	AttachImageField,
	ButtonField,
	CodeField,
	DurationField,
	GeolocationField,
	HeadingField,
	HtmlField,
	ImageField,
	JsonField,
	ReadOnlyField,
	SignatureField,
	TextEditorField,
} from './AdvancedFields';

const RENDERERS: Partial<Record<FieldType, (p: FieldProps) => React.ReactElement>> = {
	Data: DataField,
	'Small Text': SmallTextField,
	'Long Text': LongTextField,
	Text: TextField,
	Code: CodeField,
	JSON: JsonField,
	'Text Editor': TextEditorField,
	Select: SelectField,
	Autocomplete: AutocompleteField,
	Link: LinkField,
	'Dynamic Link': DynamicLinkField,
	Date: DateField,
	Datetime: DatetimeField,
	Time: TimeField,
	Duration: DurationField,
	Password: PasswordField,
	Check: CheckField,
	Int: IntField,
	Float: FloatField,
	Currency: CurrencyField,
	Percent: PercentField,
	Barcode: BarcodeField,
	Geolocation: GeolocationField,
	Signature: SignatureField,
	Color: ColorField,
	Attach: AttachField,
	'Attach Image': AttachImageField,
	Image: ImageField,
	// Layout-only types that still render standalone (no value).
	HTML: HtmlField,
	Heading: HeadingField,
	'Read Only': ReadOnlyField,
	Button: ButtonField,
};

export interface FieldRendererProps {
	df: DocField;
	/** Override the fieldname (used by child-table rendering). */
	fieldname?: string;
	/** Override the form context value source (for child-table rows). */
	value?: unknown;
	onChange?: (v: unknown) => void;
	/** Hide the antd FormItem wrapper (label/rules). */
	noFormItem?: boolean;
	/** Form item layout override. */
	layout?: FormItemProps['layout'];
	/** Pass through to underlying control. */
	size?: 'small' | 'middle' | 'large';
	/** Render in a compact form (less padding). */
	compact?: boolean;
}

export function FieldRenderer({
	df,
	fieldname: fieldnameOverride,
	value: valueOverride,
	onChange: onChangeOverride,
	noFormItem,
	size,
}: FieldRendererProps) {
	const form = useForm();
	const fieldname = fieldnameOverride ?? df.fieldname;
	const [ctxValue, ctxSetValue] = useFieldValue(fieldname);
	const value = valueOverride !== undefined ? valueOverride : ctxValue;
	const onChange = onChangeOverride ?? ctxSetValue;

	const dfMerged = form.getDf(fieldname);
	const visible = form.isFieldVisible(fieldname);
	const readOnly = form.isFieldReadOnly(fieldname) || form.state.doc.docstatus === 1 && !dfMerged.allow_on_submit;
	const required = form.isFieldRequired(fieldname);
	const error = form.state.errors[fieldname];

	const fieldProps: FieldProps = useMemo(
		() => ({
			df: dfMerged,
			value,
			onChange,
			disabled: readOnly,
			readOnly,
			size,
			linkFilters: dfMerged.link_filters as Record<string, unknown> | undefined,
			referenceDoctype: form.meta.name,
		}),
		[dfMerged, value, onChange, readOnly, size, form.meta.name],
	);

	if (!visible) return null;

	const Renderer = RENDERERS[dfMerged.fieldtype as FieldType];

	if (!Renderer) {
		return (
			<Form.Item label={df.label}>
				<span style={{ color: '#999' }}>
					Unsupported field type: {dfMerged.fieldtype}
				</span>
			</Form.Item>
		);
	}

	if (noFormItem || dfMerged.fieldtype === 'Check') {
		return (
			<div style={{ display: 'flex', alignItems: 'center', minHeight: 32 }}>
				<Renderer {...fieldProps} />
				{error && <span style={{ color: '#ff4d4f', marginLeft: 8 }}>{error}</span>}
			</div>
		);
	}

	return (
		<Form.Item
			label={dfMerged.label}
			required={required}
			validateStatus={error ? 'error' : undefined}
			help={error || dfMerged.description}
			style={{ marginBottom: 12 }}
		>
			<Renderer {...fieldProps} />
		</Form.Item>
	);
}

/** Section/Column/Tab break aware: returns true for layout-only types. */
export function isLayoutField(df: DocField): boolean {
	return ['Section Break', 'Column Break', 'Tab Break'].includes(df.fieldtype);
}

/** Re-export for FormLayout usage. */
export { evalDependsOn };
