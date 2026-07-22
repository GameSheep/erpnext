/**
 * ListView — generic list view for any doctype.
 *
 * Data source: `frappe.desk.reportview.get` (POST) — Frappe's canonical list
 * endpoint. Wraps it in a ProTable for sorting/pagination/filter UI.
 *
 * Features wired in stage 1:
 *  - columns from `in_list_view: 1` fields + `add_fields` (always fetched)
 *  - server-side sort (`order_by`)
 *  - server-side pagination (`limit_start` / `limit_page_length`)
 *  - search by `search_fields` (free text → Frappe's `filters`)
 *  - default `in_standard_filter` fields as quick filters
 *  - row click → navigate to form
 *  - "New" button (when can_create)
 *  - view-switcher placeholder (List / Report / Calendar / Gantt / Kanban / Tree)
 *
 * Customizations from list-config/<Doctype>.ts (get_indicator, formatters,
 * default filters, bulk actions) are read via the list-config registry.
 */

import { Breadcrumb, Button, Card, Popconfirm, Segmented, Space, Tag } from 'antd';
import { HomeOutlined, PlusOutlined } from '@ant-design/icons';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ProTable, type ProColumns, type ActionType, type ProFormInstance } from '@ant-design/pro-components';

import { KanbanView, CalendarView, ImageView, GanttView, availableViews, type AltViewType } from '@/components/list/AlternateViews';
import { useDocList } from '@/api/resource';

import { useDocType } from '@/api/meta';
import { useReportView } from '@/api/desk';
import type { ReportViewArgs } from '@/api/desk';
import { getListConfig } from '@/list-config';
import { canCreate, canDelete } from '@/lib/permissions';
import { slug, unscrub } from '@/lib/frappe';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import type { DocField, FrappeDoc } from '@/types/frappe';

/** Map a Frappe fieldtype to a ProTable valueType for nicer rendering. */
function proValueType(df: DocField): ProColumns<FrappeDoc>['valueType'] {
	switch (df.fieldtype) {
		case 'Date':
			return 'date';
		case 'Datetime':
			return 'dateTime';
		case 'Int':
		case 'Float':
		case 'Currency':
		case 'Percent':
			return 'digit';
		case 'Check':
			return 'select';
		case 'Select':
			return 'select';
		case 'Link':
			return 'text';
		default:
			return 'text';
	}
}

/** Format a cell value based on fieldtype (Frappe-aware). */
function formatCell(df: DocField, value: unknown): React.ReactNode {
	if (value == null || value === '') return <span style={{ color: '#999' }}>—</span>;
	switch (df.fieldtype) {
		case 'Currency':
			return formatCurrency(Number(value));
		case 'Date':
			return formatDate(String(value));
		case 'Datetime':
			return formatDate(String(value));
		case 'Check':
			return value === 1 || value === '1' ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>;
		case 'Percent':
			return `${Number(value).toFixed(2)}%`;
		default:
			return String(value);
	}
}

export function ListView() {
	const params = useParams<{ doctype: string }>();
	const doctype = params.doctype ? decodeURIComponent(params.doctype) : '';
	const actionRef = useRef<ActionType>();
	const formRef = useRef<ProFormInstance>();
	const navigate = useNavigate();
	const [selectedRows, setSelectedRows] = useState<FrappeDoc[]>([]);

	const { meta, isLoading } = useDocType(doctype);
	const reportView = useReportView();
	const listConfig = getListConfig(doctype);

	const canAdd = canCreate(doctype);
	const canDel = canDelete(doctype);
	const hasBulkActions = (listConfig?.bulkActions?.length ?? 0) > 0;
	const views = useMemo(() => (meta ? availableViews(meta) : ['list'] as AltViewType[]), [meta]);
	const [view, setView] = useState<AltViewType>('list');

	// Fetch all docs (single page, large limit) for alt views that need everything client-side.
	const altDocsQ = useDocList<FrappeDoc>(doctype, { limit: 500 }, { revalidateIfStale: false });

	const columns = useMemo<ProColumns<FrappeDoc>[]>(() => {
		if (!meta) return [];
		// Default columns: in_list_view fields, fallback to first 5 value fields.
		let listFields = meta.fields.filter((f) => f.in_list_view === 1 && !isLayoutField(f));
		if (listFields.length === 0) {
			listFields = meta.fields.filter((f) => !isLayoutField(f)).slice(0, 5);
		}
		// Always include `name` first (it's the row identity).
		const hasName = listFields.some((f) => f.fieldname === 'name');
		if (!hasName) listFields = [{ fieldname: 'name', fieldtype: 'Data', label: 'Name' }, ...listFields];

		// Merge in `add_fields` from list-config.
		const addFields = listConfig?.addFields ?? [];
		for (const fn of addFields) {
			if (!listFields.some((f) => f.fieldname === fn)) {
				const df = meta.fields.find((f) => f.fieldname === fn);
				if (df) listFields.push(df);
			}
		}

		const cols: ProColumns<FrappeDoc>[] = listFields.map((df) => {
			const col: ProColumns<FrappeDoc> = {
				title: df.label ?? unscrub(df.fieldname),
				dataIndex: df.fieldname,
				valueType: proValueType(df),
				// Frappe sorts use `fieldname` (snake); we keep it server-side.
				sorter: true,
				render: (_dom, row) => {
					// list-config formatters win.
					const formatter = listConfig?.formatters?.[df.fieldname];
					if (formatter) {
						return formatter(row[df.fieldname], df, row);
					}
					return formatCell(df, row[df.fieldname]);
				},
				// Inline filter UI for in_standard_filter fields.
				...buildFilterProps(df),
			};
			return col;
		});

		// Name column → clickable link.
		const nameCol = cols.find((c) => c.dataIndex === 'name');
		if (nameCol) {
			nameCol.render = (_dom, row) => (
				<Link to={`/desk2/form/${slug(doctype)}/${encodeURIComponent(row.name)}`}>{row.name as string}</Link>
			);
		}

		// Status indicator column (from list-config get_indicator).
		const getIndicator = listConfig?.getIndicator;
		if (getIndicator) {
			const statusField = meta.fields.find((f) => f.fieldname === 'status') ?? meta.fields.find((f) => f.fieldname === 'docstatus');
			if (statusField) {
				cols.splice(1, 0, {
					title: 'Status',
					dataIndex: statusField.fieldname,
					search: false,
					sorter: false,
					render: (_dom, row) => {
						const ind = getIndicator(row);
						if (!ind) return null;
						const [label, color] = ind;
						return <Tag color={mapIndicatorColor(color)}>{label}</Tag>;
					},
				});
			}
		}

		return cols;
	}, [meta, doctype, listConfig]);

	if (isLoading || !meta) {
		return <Card loading />;
	}

	return (
		<>
			<Breadcrumb
				items={[
					{ title: <Link to="/desk2"><HomeOutlined /></Link> },
					{ title: doctype },
				]}
				style={{ marginBottom: 12 }}
			/>
			{views.length > 1 && (
				<Space style={{ marginBottom: 12 }}>
					<Segmented
						value={view}
						onChange={(v) => setView(v as AltViewType)}
						options={views.map((v) => ({ label: v[0].toUpperCase() + v.slice(1), value: v }))}
					/>
				</Space>
			)}
			{view !== 'list' ? (
				<Card>
					{altDocsQ.isLoading ? (
						<Card loading />
					) : view === 'kanban' ? (
						<KanbanView meta={meta} docs={altDocsQ.data ?? []} />
					) : view === 'calendar' ? (
						<CalendarView meta={meta} docs={altDocsQ.data ?? []} />
					) : view === 'image' ? (
						<ImageView meta={meta} docs={altDocsQ.data ?? []} />
					) : view === 'gantt' ? (
						<GanttView meta={meta} docs={altDocsQ.data ?? []} />
					) : null}
				</Card>
			) : (
			<Card>
				<ProTable<FrappeDoc>
					actionRef={actionRef}
					formRef={formRef}
					rowKey="name"
					columns={columns}
					search={{
						filterType: 'light',
					}}
					request={async (params2, sort) => {
						// Translate ProTable params → Frappe reportview args.
						const page = params2.current ?? 1;
						const pageSize = params2.pageSize ?? 20;

						const filters: ReportViewArgs['filters'] = [];
						// Default filters from list-config.
						for (const f of listConfig?.filters ?? []) {
							filters.push(f);
						}
						// Search box.
						if (params2.title && meta.search_fields) {
							// Frappe uses OR over search_fields; we just push an `or` filter group.
							// Simplified stage-1: filter by name contains.
							filters.push([doctype, 'name', 'like', `%${params2.title}%`]);
						}
						// Per-column filters (from the search form).
						for (const [k, v] of Object.entries(params2)) {
							if (['current', 'pageSize', 'title'].includes(k)) continue;
							if (v == null || v === '') continue;
							filters.push([doctype, k, '=', v]);
						}

						const orderBy = Object.entries(sort)
							.map(([field, dir]) => `${field} ${dir === 'ascend' ? 'asc' : 'desc'}`)
							.join(', ') || 'modified desc';

						// Build field list (columns + add_fields).
						const fields = (columns.map((c) => c.dataIndex as string).filter(Boolean)) as string[];
						for (const f of listConfig?.addFields ?? []) {
							if (!fields.includes(f)) fields.push(f);
						}

						const args: ReportViewArgs = {
							doctype,
							fields,
							filters,
							order_by: orderBy,
							limit_start: (page - 1) * pageSize,
							limit_page_length: pageSize,
						};
						const res = await reportView.run(args);
						return {
							data: res.data as FrappeDoc[],
							success: true,
							total: res.total_count ?? res.data.length,
						};
					}}
					toolBarRender={() => [
						canAdd ? (
							<Button
								key="new"
								type="primary"
								icon={<PlusOutlined />}
								onClick={() => navigate(`/desk2/form/${slug(doctype)}/new-${slug(doctype)}-1`)}
							>
								Add
							</Button>
						) : null,
						<Button
							key="import-export"
							onClick={() => navigate(`/desk2/import-export/${encodeURIComponent(doctype)}`)}
						>
							Import / Export
						</Button>,
					]}
					rowSelection={
						canDel || hasBulkActions
							? {
									selectedRowKeys: selectedRows.map((r) => r.name),
									onChange: (_keys, rows) => setSelectedRows(rows),
							}
							: false
					}
					tableAlertOptionRender={
						hasBulkActions && selectedRows.length > 0
							? () => (
									<Space size={16}>
										{listConfig!.bulkActions!.map((action) => (
											<Popconfirm
												key={action.label}
												title={`${action.label} on ${selectedRows.length} item(s)?`}
												onConfirm={async () => {
													if (action.onClick) {
														await action.onClick(selectedRows);
													} else if (action.method) {
														// Call the backend bulk method with the selected names.
														void fetch(`/api/method/${action.method}`, {
															method: 'POST',
															credentials: 'same-origin',
															headers: {
																'Content-Type': 'application/json',
																'X-Frappe-CSRF-Token': window.frappe?.csrf_token ?? '',
															},
															body: JSON.stringify({
																doctype,
																names: selectedRows.map((r) => r.name),
															}),
														}).then(() => actionRef.current?.reload());
													}
													setSelectedRows([]);
												}}
											>
												<Button size="small">{action.label}</Button>
											</Popconfirm>
										))}
									</Space>
								)
							: undefined
					}
					pagination={{ pageSize: 20, showSizeChanger: true }}
					options={{ density: false, fullScreen: false, reload: () => actionRef.current?.reload() }}
					scroll={{ x: 'max-content' }}
				/>
			</Card>
			)}
		</>
	);
}

/** Build ProTable filter props (valueEnum / valueOptions) for a field. */
function buildFilterProps(df: DocField): Partial<ProColumns<FrappeDoc>> {
	if (df.in_standard_filter !== 1) return { search: false };
	if (df.fieldtype === 'Select' && df.options) {
		const opts = df.options.split('\n').map((s) => s.trim()).filter(Boolean);
		return {
			valueEnum: Object.fromEntries(opts.map((o) => [o, { text: o }])),
		};
	}
	if (df.fieldtype === 'Check') {
		return { valueEnum: { 1: { text: 'Yes' }, 0: { text: 'No' } } };
	}
	if (df.fieldtype === 'Link') {
		// ProTable would need an async fetch; for stage 1 we let it be a text input.
		return {};
	}
	return {};
}

function isLayoutField(df: DocField): boolean {
	return ['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Heading', 'Button', 'Read Only'].includes(df.fieldtype);
}

/** Map Frappe's indicator color names → antd Tag color names. */
function mapIndicatorColor(frappe?: string): string {
	switch (frappe) {
		case 'red': return 'red';
		case 'orange': return 'orange';
		case 'green': return 'green';
		case 'blue': return 'blue';
		case 'yellow': return 'gold';
		case 'gray':
		case 'darkgrey':
		case 'dark grey':
			return 'default';
		default: return 'default';
	}
}

// Stash Space/Tag for type-checking stability when unused.
void Space;
