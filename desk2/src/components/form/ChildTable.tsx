/**
 * ChildTable — renders a Frappe `Table` field as an editable antd Table.
 *
 * Frappe's child tables are sub-doctypes (istable:1) referenced from a parent
 * via a Table field with `options: "Child Doctype Name"`. Each row is a
 * document with its own fields, validated in the context of the parent.
 *
 * This component:
 *  - Reads the child doctype's meta (cached via useDocType).
 *  - Renders an editable row per parent.doc[tableField] entry.
 *  - Wires row add/remove/reorder to the FormContext dispatch.
 *  - Shows only `in_list_view: 1` fields by default; expanding a row opens
 *    a Modal with the full FieldRenderer set for that child meta.
 *
 * For stage 1 we keep the editing inline (no modal expansion yet).
 */

import { Button, Modal, Popconfirm, Space, Table, type TableColumnType } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';

import { useDocType } from '@/api/meta';
import { useForm } from './FormContext';
import { FieldRenderer } from '@/components/fields/FieldRenderer';
import type { DocField, FrappeDoc } from '@/types/frappe';
import { canCreate } from '@/lib/permissions';

export interface ChildTableProps {
	/** The Table field on the parent doctype. */
	df: DocField;
	/** Whether to render compactly (inside the form grid). */
	compact?: boolean;
}

export function ChildTable({ df }: ChildTableProps) {
	const form = useForm();
	const childDoctype = (df.options as string) || '';
	const { meta: childMeta } = useDocType(childDoctype);
	const [editingRow, setEditingRow] = useState<FrappeDoc | null>(null);

	const rows = (form.state.doc[df.fieldname] as FrappeDoc[]) ?? [];

	const visibleFields = useMemo(() => {
		if (!childMeta) return [];
		// Prefer in_list_view fields; fall back to first 4 value fields.
		const inListView = childMeta.fields.filter((f) => f.in_list_view === 1 && !isLayoutBreak(f));
		if (inListView.length > 0) return inListView;
		return childMeta.fields.filter((f) => !isLayoutBreak(f)).slice(0, 4);
	}, [childMeta]);

	const columns: TableColumnType<FrappeDoc>[] = useMemo(() => {
		const cols: TableColumnType<FrappeDoc>[] = visibleFields.map((fieldDef) => ({
			title: fieldDef.label ?? fieldDef.fieldname,
			dataIndex: fieldDef.fieldname,
			width: fieldDef.columns ? `${fieldDef.columns * 40}px` : undefined,
			render: (_value: unknown, row: FrappeDoc) => (
				<FieldRenderer
					df={{ ...fieldDef, label: '' }}
					fieldname={fieldDef.fieldname}
					// Wire to the parent's SET_CHILD_VALUE via a custom onChange.
					value={row[fieldDef.fieldname]}
					onChange={(v) => {
						form.dispatch({
							type: 'SET_CHILD_VALUE',
							tableField: df.fieldname,
							rowName: row.name,
							fieldname: fieldDef.fieldname,
							value: v,
						});
					}}
					noFormItem
					size="small"
				/>
			),
		}));
		// Row actions column (expand-to-modal + delete).
		cols.push({
			title: '',
			key: '__actions',
			width: 70,
			fixed: 'right',
			render: (_v: unknown, row: FrappeDoc) => (
				<Space size={0}>
					<Button
						type="text"
						size="small"
						icon={<EditOutlined />}
						onClick={() => setEditingRow(row)}
						title="Edit full row"
					/>
					<Popconfirm
						title="Remove this row?"
						onConfirm={() =>
							form.dispatch({ type: 'REMOVE_CHILD_ROW', tableField: df.fieldname, rowName: row.name })
						}
					>
						<Button type="text" danger size="small" icon={<DeleteOutlined />} />
					</Popconfirm>
				</Space>
			),
		});
		return cols;
	}, [visibleFields, form, df.fieldname]);

	const canAdd = canCreate(childDoctype);

	if (!childMeta) {
		return <Table loading={true} dataSource={[]} columns={[]} size="small" />;
	}

	return (
		<div style={{ marginBottom: 16 }}>
			<Table<FrappeDoc>
				dataSource={rows}
				columns={columns}
				rowKey="name"
				size="small"
				pagination={false}
				bordered
				scroll={{ x: 'max-content' }}
				footer={() =>
					canAdd ? (
						<Button
							type="dashed"
							size="small"
							icon={<PlusOutlined />}
							onClick={() => form.dispatch({ type: 'ADD_CHILD_ROW', tableField: df.fieldname, row: {} })}
						>
							Add row
						</Button>
					) : null
				}
			/>
			{rows.length === 0 && (
				<Space style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
					No rows yet{canAdd ? ' — click "Add row" to create one' : ''}.
				</Space>
			)}

			{/* Full-row editor modal: renders every field of the child meta. */}
			<Modal
				open={!!editingRow}
				title={`Edit ${childMeta.name}`}
				onCancel={() => setEditingRow(null)}
				onOk={() => setEditingRow(null)}
				width={720}
				destroyOnClose
			>
				{editingRow &&
					childMeta.fields
						.filter((f) => !['Section Break', 'Column Break', 'Tab Break'].includes(f.fieldtype))
						.map((f) => (
							<FieldRenderer
								key={f.fieldname}
								df={f}
								value={editingRow[f.fieldname]}
								onChange={(v) => {
									// Update both the modal's local state and the parent form.
									setEditingRow({ ...editingRow, [f.fieldname]: v });
									form.dispatch({
										type: 'SET_CHILD_VALUE',
										tableField: df.fieldname,
										rowName: editingRow.name,
										fieldname: f.fieldname,
										value: v,
									});
								}}
							/>
						))}
			</Modal>
		</div>
	);
}

function isLayoutBreak(df: DocField): boolean {
	return ['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Heading'].includes(df.fieldtype);
}
