/**
 * ReportView — generic report runner.
 *
 * Calls `frappe.desk.query_report.run` and renders the result table. Filters
 * come from `frappe.desk.query_report.get` (when the report has a JS filter
 * definition) or fall back to a best-effort UI from the report JSON.
 *
 * Supports all three Frappe report types:
 *  - Script Report (report_type="Script Report") — has Python `execute()`
 *  - Query Report (report_type="Query Report") — inline SQL in JSON
 *  - Report Builder (report_type="Report Builder") — stored query spec
 *
 * Frappe's run endpoint accepts all three transparently.
 */

import { Breadcrumb, Button, Card, Space, Table, Tag, Typography } from 'antd';
import { DownloadOutlined, PlayCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ProForm, ProFormField } from '@ant-design/pro-components';

import { useReportMeta, useReportRun, type QueryReportResponse, type ReportColumn, type ReportFilterDef } from '@/api/report';
import { FieldRenderer } from '@/components/fields/FieldRenderer';
import type { DocField } from '@/types/frappe';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { _ } from '@/lib/translate';

const { Title, Text } = Typography;

export function ReportView() {
	const params = useParams<{ name: string }>();
	const reportName = params.name ? decodeURIComponent(params.name) : '';
	const meta = useReportMeta(reportName);
	const run = useReportRun();

	const [filters, setFilters] = useState<Record<string, unknown>>({});

	const filterDefs = meta.data?.filters ?? [];

	const columns = useMemo(() => {
		const cols = (run.result?.columns ?? []) as ReportColumn[];
		return cols.map((c) => ({
			title: c.label ?? c.fieldname,
			dataIndex: c.fieldname,
			width: typeof c.width === 'number' ? c.width : undefined,
			render: (value: unknown) => formatReportCell(c, value),
		}));
	}, [run.result]);

	const onRun = async () => {
		// Fill in defaults for required filters not yet set.
		const filled: Record<string, unknown> = { ...filters };
		for (const f of filterDefs) {
			if (filled[f.fieldname] === undefined && f.default !== undefined) {
				filled[f.fieldname] = f.default;
			}
		}
		setFilters(filled);
		await run.run(reportName, filled);
	};

	return (
		<>
			<Breadcrumb
				items={[{ title: <Link to="/desk2">Home</Link> }, { title: 'Reports' }, { title: reportName }]}
				style={{ marginBottom: 12 }}
			/>
			<Card>
				<Space direction="vertical" size="middle" style={{ width: '100%' }}>
					<div>
						<Title level={4} style={{ marginBottom: 4 }}>{reportName}</Title>
						{meta.data?.report?.report_type && (
							<Tag>{meta.data.report.report_type}</Tag>
						)}
					</div>

					{filterDefs.length > 0 && (
						<Card type="inner" title="Filters" size="small">
							<ProForm
								submitter={false}
								layout="inline"
								onValuesChange={(_, all) => setFilters(all)}
							>
								{filterDefs.map((f) => (
									<ProFormField key={f.fieldname} name={f.fieldname} label={f.label ?? _(f.fieldname)}>
										<ReportFilterControl def={f} value={filters[f.fieldname]} onChange={(v) => setFilters((s) => ({ ...s, [f.fieldname]: v }))} />
									</ProFormField>
								))}
								<Button type="primary" icon={<PlayCircleOutlined />} loading={run.loading} onClick={onRun}>
									Run
								</Button>
							</ProForm>
						</Card>
					)}

					{run.error && <Text type="danger">{String(run.error)}</Text>}

					<Space>
						<Button icon={<DownloadOutlined />} disabled={!run.result} onClick={() => exportCsv(reportName, run.result)}>
							Export
						</Button>
						<Button icon={<PrinterOutlined />} disabled={!run.result} onClick={() => window.print()}>
							Print
						</Button>
					</Space>

					<Table
						dataSource={run.result?.result ?? []}
						columns={columns}
						rowKey={(_, i) => String(i)}
						size="small"
						bordered
						pagination={{ pageSize: 50, showSizeChanger: true }}
						scroll={{ x: 'max-content' }}
						summary={run.result?.add_total_row ? undefined : undefined}
					/>
				</Space>
			</Card>
		</>
	);
}

/** Render a single report filter using the FieldRenderer (which handles all fieldtypes). */
function ReportFilterControl({
	def,
	value,
	onChange,
}: {
	def: ReportFilterDef;
	value: unknown;
	onChange: (v: unknown) => void;
}) {
	// Adapt ReportFilterDef → DocField shape so FieldRenderer works as-is.
	const df: DocField = {
		fieldname: def.fieldname,
		fieldtype: def.fieldtype,
		label: def.label,
		options: def.options,
		reqd: def.reqd,
	};
	return <FieldRenderer df={df} value={value} onChange={onChange} noFormItem />;
}

/** Format a report cell value based on the column's fieldtype. */
function formatReportCell(col: ReportColumn, value: unknown): React.ReactNode {
	if (value == null || value === '') return <Text type="secondary">—</Text>;
	switch (col.fieldtype) {
		case 'Currency':
			return formatCurrency(Number(value));
		case 'Date':
		case 'Datetime':
			return formatDate(String(value));
		case 'Percent':
			return `${Number(value).toFixed(2)}%`;
		default:
			return String(value);
	}
}

/** Minimal CSV export (Frappe also offers `export_query` server-side). */
function exportCsv(name: string, result: QueryReportResponse | null) {
	if (!result) return;
	const cols = result.columns.map((c) => `"${(c.label ?? c.fieldname).replace(/"/g, '""')}"`).join(',');
	const rows = result.result.map((r) =>
		result.columns.map((c) => {
			const v = (r as Record<string, unknown>)[c.fieldname] ?? '';
			return `"${String(v).replace(/"/g, '""')}"`;
		}).join(','),
	);
	const csv = [cols, ...rows].join('\n');
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${name}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}
