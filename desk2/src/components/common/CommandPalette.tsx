/**
 * CommandPalette — the Cmd/Ctrl+K omnibar for global search.
 *
 * Calls `frappe.desk.search.search` with the current query and surfaces:
 *  - doctypes (navigate to list)
 *  - reports (navigate to report)
 *  - workspaces (navigate to workspace)
 *  - documents (navigate to form)
 *
 * Frappe's search endpoint returns a structured response grouped by category.
 */

import { Modal, Input, List, Typography, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { useFrappeGetCall } from 'frappe-react-sdk';
import { slug } from '@/lib/frappe';
import { useHotkeys } from 'react-hotkeys-hook';

const { Text } = Typography;

export interface CommandPaletteProps {
	open: boolean;
	onClose: () => void;
}

interface SearchHit {
	value?: string;
	label?: string;
	description?: string;
	route?: string;
	category?: string;
	doctype?: string;
	name?: string;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
	const [text, setText] = useState('');
	const navigate = useNavigate();

	const { data, isLoading } = useFrappeGetCall<{ message: SearchHit[] }>(
		'frappe.desk.search.search',
		{ text, limit: 20 },
		open && text ? ['omnibar', text] : null,
		{ revalidateIfStale: false, revalidateOnFocus: false, keepPreviousData: true },
	);

	const results = data?.message ?? [];

	const handleSelect = (hit: SearchHit) => {
		const route = hit.route
			? hit.route
			: hit.doctype && hit.name
				? `/desk2/form/${slug(hit.doctype)}/${encodeURIComponent(hit.name)}`
				: hit.doctype
					? `/desk2/list/${slug(hit.doctype)}`
					: null;
		if (route) navigate(route);
		onClose();
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			footer={null}
			width={640}
			closable={false}
			styles={{ body: { padding: 0 } }}
		>
			<Input
				autoFocus
				size="large"
				placeholder="Search anything… (doctypes, reports, documents)"
				prefix={<SearchOutlined />}
				value={text}
				onChange={(e) => setText(e.target.value)}
				style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }}
			/>
			<List
				loading={isLoading}
				dataSource={results}
				style={{ maxHeight: 360, overflow: 'auto' }}
				renderItem={(hit) => (
					<List.Item style={{ cursor: 'pointer', padding: '8px 16px' }} onClick={() => handleSelect(hit)}>
						<List.Item.Meta
							title={
								<span>
									{hit.label ?? hit.value}
									{hit.category && (
										<Tag style={{ marginLeft: 8 }}>{hit.category}</Tag>
									)}
								</span>
							}
							description={<Text type="secondary">{hit.description}</Text>}
						/>
					</List.Item>
				)}
			/>
		</Modal>
	);
}

/** Mount-once hook that wires the global Cmd/Ctrl+K shortcut. */
export function useCommandPaletteToggle() {
	const [open, setOpen] = useState(false);
	useHotkeys('mod+k', (e) => {
		e.preventDefault();
		setOpen((v) => !v);
	});
	useEffect(() => {
		// No-op; hook lifecycle kept for future auto-focus / analytics wiring.
	}, []);
	return useMemo(() => ({ open, setOpen }), [open]);
}
