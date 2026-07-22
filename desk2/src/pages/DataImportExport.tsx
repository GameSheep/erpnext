/**
 * DataImportExport — import/export wizard for any doctype.
 *
 * Export: fetch all rows via `frappe.desk.reportview.get` (paginated) and
 * write a CSV with the doctype's value-carrying fields as columns.
 *
 * Import: accept a CSV/Excel, preview the first few rows, then POST to
 * `frappe.core.doctype.data_import.data_import.upload_preview` (Frappe's
 * standard import endpoint). Stage-1 ships the export fully + a basic
 * upload UI for import.
 */

import { Alert, Breadcrumb, Button, Card, Radio, Space, Table, Upload, Typography, message } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { useDocType } from '@/api/meta';
import { useReportView } from '@/api/desk';
import type { DocField, FrappeDoc } from '@/types/frappe';

const { Text, Title } = Typography;

type Mode = 'export' | 'import';

export function DataImportExport() {
	const params = useParams<{ doctype: string }>();
	const doctype = params.doctype ? decodeURIComponent(params.doctype) : '';
	const { meta } = useDocType(doctype);
	const reportView = useReportView();
	const [mode, setMode] = useState<Mode>('export');
	const [exporting, setExporting] = useState(false);
	const [previewData, setPreviewData] = useState<FrappeDoc[]>([]);

	const exportableFields = meta
		? meta.fields.filter((f) => !['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Heading', 'Button', 'Read Only'].includes(f.fieldtype))
		: [];

	const onExport = async () => {
		setExporting(true);
		try {
			// Fetch all rows in pages of 500.
			const all: FrappeDoc[] = [];
			let start = 0;
			const pageSize = 500;
			for (;;) {
				const res = await reportView.run({
					doctype,
					fields: ['name', ...exportableFields.map((f) => f.fieldname)],
					limit_start: start,
					limit_page_length: pageSize,
					order_by: 'name asc',
				});
				all.push(...(res.data as FrappeDoc[]));
				if (res.data.length < pageSize || (res.last ?? false)) break;
				start += pageSize;
				if (start > 10000) break; // safety cap
			}
			downloadCsv(doctype, exportableFields, all);
			message.success(`Exported ${all.length} rows`);
		} catch (err) {
			message.error(`Export failed: ${String(err)}`);
		} finally {
			setExporting(false);
		}
	};

	const onImportUpload = async (file: File) => {
		// Stage-1: just preview the CSV. Full import goes through Frappe's
		// Data Import doctype which requires a multi-step server flow.
		const text = await file.text();
		const grid = parseCsv(text);
		if (grid.length < 2) {
			message.warning('CSV appears empty or has no data rows.');
			return false;
		}
		const header = grid[0];
		const objs = grid.slice(1, 51).map((row) => {
			const obj: Record<string, unknown> = {};
			header.forEach((h, i) => { obj[h] = row[i]; });
			return obj as unknown as FrappeDoc;
		});
		setPreviewData(objs);
		message.info(`Parsed ${grid.length - 1} rows. Full server-side import is available via the standard Data Import doctype.`);
		return false; // prevent auto-upload
	};

	if (!meta) return <Card loading />;

	return (
		<>
			<Breadcrumb
				items={[
					{ title: <Link to="/desk2">Home</Link> },
					{ title: <Link to={`/desk2/list/${encodeURIComponent(doctype)}`}>{doctype}</Link> },
					{ title: 'Import / Export' },
				]}
				style={{ marginBottom: 12 }}
			/>
			<Card>
				<Space direction="vertical" size="large" style={{ width: '100%' }}>
					<div>
						<Title level={4}>Import / Export — {doctype}</Title>
						<Radio.Group value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
							<Radio.Button value="export"><DownloadOutlined /> Export</Radio.Button>
							<Radio.Button value="import"><UploadOutlined /> Import</Radio.Button>
						</Radio.Group>
					</div>

					{mode === 'export' ? (
						<Card type="inner" title="Export to CSV">
							<Space direction="vertical">
								<Text>Downloads all {exportableFields.length} fields for every {doctype} record as a CSV file.</Text>
								<Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={onExport}>
									Export {doctype}
								</Button>
							</Space>
						</Card>
					) : (
						<Card type="inner" title="Import from CSV">
							<Space direction="vertical" style={{ width: '100%' }}>
								<Alert
									type="info"
									showIcon
									message="Upload a CSV with the same columns as the export."
									description="For full validation + dry-run, use the standard Data Import doctype at /desk2/form/Data%20Import/new-data-import-1."
								/>
								<Upload.Dragger accept=".csv" beforeUpload={onImportUpload} maxCount={1}>
									<p className="ant-upload-drag-icon"><UploadOutlined /></p>
									<p className="ant-upload-text">Click or drag a CSV file here</p>
								</Upload.Dragger>
								{previewData.length > 0 && (
									<Table
										size="small"
										dataSource={previewData}
										columns={Object.keys(previewData[0]).map((k) => ({ title: k, dataIndex: k }))}
										rowKey={(_, i) => String(i)}
										pagination={{ pageSize: 10 }}
										scroll={{ x: 'max-content' }}
									/>
								)}
							</Space>
						</Card>
					)}
				</Space>
			</Card>
		</>
	);
}

/** Serialize fields + rows to CSV and trigger a download. */
function downloadCsv(doctype: string, fields: DocField[], rows: FrappeDoc[]) {
	const headers = ['name', ...fields.map((f) => f.fieldname)];
	const lines = [headers.map(csvEscape).join(',')];
	for (const row of rows) {
		lines.push(headers.map((h) => csvEscape(row[h])).join(','));
	}
	const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${doctype}-${new Date().toISOString().slice(0, 10)}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

function csvEscape(v: unknown): string {
	const s = v == null ? '' : String(v);
	return `"${s.replace(/"/g, '""')}"`;
}

/** Minimal CSV parser (handles quoted fields + commas). */
function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (inQuotes) {
			if (c === '"') {
				if (text[i + 1] === '"') { field += '"'; i++; }
				else inQuotes = false;
			} else field += c;
		} else {
			if (c === '"') inQuotes = true;
			else if (c === ',') { row.push(field); field = ''; }
			else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
			else if (c === '\r') { /* skip */ }
			else field += c;
		}
	}
	if (field || row.length) { row.push(field); rows.push(row); }
	return rows;
}
