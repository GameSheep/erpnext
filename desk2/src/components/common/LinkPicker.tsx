/**
 * LinkPicker — the canonical Frappe "Link field" control.
 *
 * Ported from banking/src/components/common/LinkFieldCombobox.tsx. Uses antd
 * AutoComplete backed by `frappe.desk.search.search_link`. Supports:
 *  - debounced search (400ms by default)
 *  - "Create new {Label}" deep-link when the user has create permission
 *  - optional display of the title field (when meta.show_title_field_in_link)
 *  - server-side link filters (set via frm.set_query / df.link_filters)
 */

import { AutoComplete, type AutoCompleteProps, Input, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { useLinkSearch, type LinkSearchResult } from '@/api/search';
import { canCreate } from '@/lib/permissions';
import { slug } from '@/lib/frappe';

const { Text } = Typography;

export interface LinkPickerProps {
	doctype: string;
	value?: string;
	onChange?: (value: string | undefined, option?: LinkSearchResult) => void;
	/** Server-side filters to narrow the search (JSON-serializable). */
	filters?: Record<string, unknown>;
	/** The doctype this link is on (passed to Frappe for permission context). */
	referenceDoctype?: string;
	/** Disable the input. */
	disabled?: boolean;
	/** Placeholder. */
	placeholder?: string;
	/** Show "create new" link at the bottom (default true). */
	showCreate?: boolean;
	/** Auto-focus on mount. */
	autoFocus?: boolean;
	/** Debounce in ms (default 400). */
	debounce?: number;
	/** Size matching antd Input. */
	size?: 'small' | 'middle' | 'large';
}

export function LinkPicker({
	doctype,
	value,
	onChange,
	filters,
	referenceDoctype,
	disabled,
	placeholder,
	showCreate = true,
	autoFocus,
	debounce = 400,
	size,
}: LinkPickerProps) {
	const navigate = useNavigate();
	const [text, setText] = useState('');
	const [debounced, setDebounced] = useState('');
	const [open, setOpen] = useState(false);

	// Debounce the search text.
	useEffect(() => {
		const t = setTimeout(() => setDebounced(text), debounce);
		return () => clearTimeout(t);
	}, [text, debounce]);

	const { results, isLoading } = useLinkSearch(doctype, debounced, {
		filters,
		reference_doctype: referenceDoctype,
		enabled: open && debounced.length > 0,
	});

	const userCanCreate = showCreate && canCreate(doctype);

	const options: AutoCompleteProps['options'] = useMemo(() => {
		const opts: NonNullable<AutoCompleteProps['options']> = results.map((r) => ({
			value: r.value,
			label: (
				<Space direction="vertical" size={0} style={{ width: '100%' }}>
					<Text strong>{r.label || r.value}</Text>
					{r.description ? (
						<Text type="secondary" style={{ fontSize: 12 }}>
							{r.description}
						</Text>
					) : null}
				</Space>
			),
			// Stash the raw result for onChange.
			result: r,
		}));
		if (userCanCreate) {
			opts.push({
				value: `__create__`,
				label: (
					<Text type="secondary">
						<PlusOutlined /> Create new {doctype}
					</Text>
				),
			});
		}
		return opts;
	}, [results, userCanCreate, doctype]);

	const handleSelect = useCallback(
		(val: string, option: { result?: LinkSearchResult } | unknown) => {
			if (val === '__create__') {
				setOpen(false);
				setText('');
				navigate(`/desk2/form/${slug(doctype)}/new-${slug(doctype)}-1`);
				return;
			}
			const opt = option as { result?: LinkSearchResult };
			onChange?.(val, opt.result);
			setText('');
			setOpen(false);
		},
		[doctype, navigate, onChange],
	);

	return (
		<AutoComplete
			value={open ? text : value ?? ''}
			options={options}
			open={open}
			onDropdownVisibleChange={setOpen}
			onSearch={setText}
			onSelect={handleSelect}
			disabled={disabled}
			placeholder={placeholder ?? `Search ${doctype}…`}
			size={size}
			style={{ width: '100%' }}
			autoFocus={autoFocus}
			notFoundContent={isLoading ? 'Searching…' : text ? 'No matches' : 'Type to search'}
		>
			<Input allowClear={false} />
		</AutoComplete>
	);
}
