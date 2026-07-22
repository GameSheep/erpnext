/**
 * Alternate list views: Kanban, Calendar, Image, Gantt.
 *
 * Each takes the same data (a FrappeDoc[] + meta) and renders a different
 * visualization. ListView switches between them via a Segmented control at
 * the top, gated by the doctype's capabilities (kanban_field / calendar_field /
 * image_field / gantt fields).
 */

import { Avatar, Calendar as AntCalendar, Card, Col, Empty, List, Row, Tag, Typography } from 'antd';
import { Link } from 'react-router';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import type { DocField, DocMeta, FrappeDoc } from '@/types/frappe';
import { slug } from '@/lib/frappe';

const { Text, Title } = Typography;

export type AltViewType = 'list' | 'kanban' | 'calendar' | 'image' | 'gantt';

/** Determine which alt views are available for a doctype based on its meta. */
export function availableViews(meta: DocMeta): AltViewType[] {
	const views: AltViewType[] = ['list'];
	// Kanban: requires a Select field usable as the column.
	if (meta.fields.some((f) => f.fieldtype === 'Select')) views.push('kanban');
	// Calendar: requires a Date/Datetime field.
	if (meta.fields.some((f) => f.fieldtype === 'Date' || f.fieldtype === 'Datetime')) views.push('calendar');
	// Image: requires an image_field.
	if (meta.image_field) views.push('image');
	// Gantt: requires start/end date fields.
	if (meta.fields.some((f) => f.fieldname.includes('start_date')) && meta.fields.some((f) => f.fieldname.includes('end_date'))) {
		views.push('gantt');
	}
	return views;
}

/** Pick the best field for each view's axis. */
function findField(meta: DocMeta, predicate: (f: DocField) => boolean): DocField | undefined {
	return meta.fields.find(predicate);
}

// ---------- Kanban ----------

export interface KanbanViewProps {
	meta: DocMeta;
	docs: FrappeDoc[];
}

export function KanbanView({ meta, docs }: KanbanViewProps) {
	// The column field is the first Select with a `status`-ish name, else first Select.
	const colField =
		findField(meta, (f) => f.fieldtype === 'Select' && f.fieldname === 'status') ??
		findField(meta, (f) => f.fieldtype === 'Select');
	if (!colField) return <Empty description="No Select field for Kanban columns" />;

	const columns = (colField.options ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
	const titleField = meta.title_field ?? 'name';

	return (
		<Row gutter={[8, 8]} style={{ overflowX: 'auto', paddingBottom: 8 }}>
			{columns.map((col) => {
				const items = docs.filter((d) => (d[colField.fieldname] as string) === col);
				return (
					<Col key={col} style={{ minWidth: 260 }}>
						<Card
							size="small"
							title={<span>{col} <Tag>{items.length}</Tag></span>}
							bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
						>
							{items.map((doc) => (
								<Link key={doc.name} to={`/desk2/form/${slug(meta.name)}/${encodeURIComponent(doc.name)}`}>
									<Card size="small" hoverable style={{ marginBottom: 8 }}>
										<Text strong>{String(doc[titleField] ?? doc.name)}</Text>
										{meta.image_field && doc[meta.image_field] != null && (
											<div>
												<img
													src={String(doc[meta.image_field])}
													alt=""
													style={{ width: '100%', maxHeight: 80, objectFit: 'cover', borderRadius: 4, marginTop: 4 }}
												/>
											</div>
										)}
									</Card>
								</Link>
							))}
							{items.length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>No items</Text>}
						</Card>
					</Col>
				);
			})}
		</Row>
	);
}

// ---------- Calendar ----------

export function CalendarView({ meta, docs }: KanbanViewProps) {
	const dateField = findField(meta, (f) => f.fieldtype === 'Date' || f.fieldtype === 'Datetime');
	if (!dateField) return <Empty description="No Date field for Calendar" />;
	const titleField = meta.title_field ?? 'name';

	// Build a map of date-string → docs for quick cell rendering.
	const byDate = new Map<string, FrappeDoc[]>();
	for (const d of docs) {
		const dv = d[dateField.fieldname];
		if (!dv) continue;
		const key = dayjs(String(dv)).format('YYYY-MM-DD');
		const list = byDate.get(key) ?? [];
		list.push(d);
		byDate.set(key, list);
	}

	const cellRender = (date: Dayjs) => {
		const key = date.format('YYYY-MM-DD');
		const items = byDate.get(key);
		if (!items || items.length === 0) return null;
		return (
			<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
				{items.slice(0, 3).map((doc) => (
					<li key={doc.name} style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
						<Link to={`/desk2/form/${slug(meta.name)}/${encodeURIComponent(doc.name)}`}>
							{String(doc[titleField] ?? doc.name)}
						</Link>
					</li>
				))}
				{items.length > 3 && <li style={{ fontSize: 11, color: '#999' }}>+{items.length - 3} more</li>}
			</ul>
		);
	};

	return <AntCalendar cellRender={cellRender} mode="month" />;
}

// ---------- Image gallery ----------

export function ImageView({ meta, docs }: KanbanViewProps) {
	const imgField = meta.image_field;
	const titleField = meta.title_field ?? 'name';
	if (!imgField) return <Empty description="No image field on this doctype" />;

	return (
		<Row gutter={[16, 16]}>
			{docs.map((doc) => (
				<Col key={doc.name} xs={24} sm={12} md={8} lg={6}>
					<Link to={`/desk2/form/${slug(meta.name)}/${encodeURIComponent(doc.name)}`}>
						<Card hoverable cover={
							doc[imgField] ? (
								<img
									alt={String(doc[titleField] ?? doc.name)}
									src={String(doc[imgField])}
									style={{ height: 160, objectFit: 'cover' }}
								/>
							) : (
								<div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
									<Avatar shape="square" size={64}>{String(doc[titleField] ?? doc.name).charAt(0)}</Avatar>
								</div>
							)
						}>
							<Card.Meta
								title={String(doc[titleField] ?? doc.name)}
								description={<Text type="secondary">{doc.name}</Text>}
							/>
						</Card>
					</Link>
				</Col>
			))}
		</Row>
	);
}

// ---------- Gantt (simple horizontal bars) ----------

export function GanttView({ meta, docs }: KanbanViewProps) {
	const startField = findField(meta, (f) => f.fieldname.includes('start_date') || f.fieldname === 'from_date');
	const endField = findField(meta, (f) => f.fieldname.includes('end_date') || f.fieldname === 'to_date');
	const titleField = meta.title_field ?? 'name';
	if (!startField || !endField) return <Empty description="No start/end date fields for Gantt" />;

	// Compute the overall date range.
	const dates = docs
		.map((d) => ({ start: dayjs(String(d[startField.fieldname])), end: dayjs(String(d[endField.fieldname])) }))
		.filter((x) => x.start.isValid() && x.end.isValid());
	if (dates.length === 0) return <Empty description="No dated items" />;
	const minDate = dates.reduce((min, d) => (d.start.isBefore(min) ? d.start : min), dates[0].start);
	const maxDate = dates.reduce((max, d) => (d.end.isAfter(max) ? d.end : max), dates[0].end);
	const totalDays = Math.max(1, maxDate.diff(minDate, 'day'));

	return (
		<List
			dataSource={docs}
			renderItem={(doc) => {
				const start = dayjs(String(doc[startField.fieldname]));
				const end = dayjs(String(doc[endField.fieldname]));
				if (!start.isValid() || !end.isValid()) return null;
				const offsetPct = (start.diff(minDate, 'day') / totalDays) * 100;
				const widthPct = Math.max(2, (end.diff(start, 'day') / totalDays) * 100);
				return (
					<List.Item>
						<div style={{ width: '100%' }}>
							<Link to={`/desk2/form/${slug(meta.name)}/${encodeURIComponent(doc.name)}`}>
								<Text strong>{String(doc[titleField] ?? doc.name)}</Text>
							</Link>
							<div style={{ position: 'relative', height: 20, background: '#f0f0f0', borderRadius: 4, marginTop: 4 }}>
								<div
									style={{
										position: 'absolute',
										left: `${offsetPct}%`,
										width: `${widthPct}%`,
										height: '100%',
										background: '#e74c3c',
										borderRadius: 4,
									}}
									title={`${start.format('YYYY-MM-DD')} → ${end.format('YYYY-MM-DD')}`}
								/>
							</div>
						</div>
					</List.Item>
				);
			}}
		/>
	);
}

// Keep Title referenced for tree-shaking friendliness in edge toolchains.
void Title;
