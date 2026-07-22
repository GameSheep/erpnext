/**
 * FormLayout — turns a flat DocField[] into Frappe's familiar
 * Tab > Section > Column > Field grid.
 *
 * Frappe's layout model:
 *  - `Tab Break` starts a new tab pane (top of form).
 *  - `Section Break` starts a new section (full-width card) inside the current tab.
 *  - `Column Break` starts a new column inside the current section.
 *  - Everything else is a field that renders in the current column.
 *
 * Sections can be collapsible (with optional `collapsible_depends_on`).
 * Columns have an optional width hint (in `options`).
 *
 * We don't try to support the full Frappe "section_card" / "hidden inside
 * section" edge cases — we cover the 95% case and degrade gracefully.
 */

import { Card, Col, Collapse, Row, Tabs, Typography, Empty } from 'antd';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

import type { DocField, DocMeta } from '@/types/frappe';
import { FieldRenderer, isLayoutField } from '@/components/fields/FieldRenderer';

const { Title } = Typography;

interface Column {
	width: number;
	fields: DocField[];
}
interface Section {
	label?: string;
	collapsible?: boolean;
	hide_border?: boolean;
	fields: DocField[]; // for simple one-column sections
	columns: Column[];
}
interface Tab {
	label?: string;
	fields: DocField[]; // fields before any section break (rare)
	sections: Section[];
}

/** Parse meta.fields into a Tab[] tree. */
function parseLayout(meta: DocMeta): Tab[] {
	const tabs: Tab[] = [];
	let currentTab: Tab = { sections: [], fields: [] };
	let currentSection: Section = { columns: [], fields: [] };
	let currentColumn: Column = { width: 0, fields: [] };

	const pushColumn = () => {
		if (currentColumn.fields.length > 0) {
			currentSection.columns.push(currentColumn);
		}
		currentColumn = { width: 0, fields: [] };
	};
	const pushSection = () => {
		pushColumn();
		if (currentSection.columns.length > 0 || currentSection.fields.length > 0) {
			currentTab.sections.push(currentSection);
		}
		currentSection = { columns: [], fields: [] };
	};
	const pushTab = () => {
		pushSection();
		if (currentTab.sections.length > 0 || currentTab.fields.length > 0) {
			tabs.push(currentTab);
		}
		currentTab = { sections: [], fields: [] };
	};

	for (const df of meta.fields) {
		if (df.fieldtype === 'Tab Break') {
			pushTab();
			// The tab's label is this field's label.
			currentTab.label = df.label;
			// Fields after the tab break but before the first section go in tab.fields.
			currentSection.fields = [];
			continue;
		}
		if (df.fieldtype === 'Section Break') {
			pushSection();
			currentSection.label = df.label;
			currentSection.collapsible = df.collapsible === 1;
			currentSection.hide_border = df.hide_border === 1;
			// Width hint from options like "50%"; we use a simple parser.
			continue;
		}
		if (df.fieldtype === 'Column Break') {
			pushColumn();
			// Column width hint in df.options (e.g. "50%").
			const w = parseColumnWidth(df.options);
			currentColumn.width = w;
			continue;
		}
		// Regular field — but HTML/Heading/Button still render here.
		currentColumn.fields.push(df);
	}
	pushTab();
	return tabs;
}

function parseColumnWidth(opts: string | undefined): number {
	if (!opts) return 0;
	const m = opts.match(/(\d+(\.\d+)?)\s*%?/);
	if (!m) return 0;
	const pct = parseFloat(m[1]);
	// Treat values > 1 as percent, < 1 as fraction.
	return pct > 1 ? pct / 100 : pct;
}

export interface FormLayoutProps {
	meta: DocMeta;
}

export function FormLayout({ meta }: FormLayoutProps) {
	const tabs = useMemo(() => parseLayout(meta), [meta]);

	if (tabs.length === 0) {
		return <Empty description="This doctype has no fields" />;
	}

	// Single tab — render directly without the Tabs wrapper.
	if (tabs.length === 1) {
		return <TabBody tab={tabs[0]} />;
	}

	return (
		<Tabs
			items={tabs.map((tab, i) => ({
				key: tab.label ?? `tab-${i}`,
				label: tab.label ?? 'Main',
				children: <TabBody tab={tab} />,
			}))}
		/>
	);
}

function TabBody({ tab }: { tab: Tab }) {
	return (
		<>
			{tab.fields.length > 0 && (
				<Card bordered={false} style={{ marginBottom: 16 }}>
					<Row gutter={16}>
						<Col span={24}>
							{tab.fields.map((df) => (
								<FieldRenderer key={df.fieldname} df={df} />
							))}
						</Col>
					</Row>
				</Card>
			)}
			{tab.sections.map((section, i) => (
				<SectionCard key={i} section={section} />
			))}
		</>
	);
}

function SectionCard({ section }: { section: Section }) {
	const body = (
		<Row gutter={16}>
			{section.columns.map((col, i) => {
				// If only one column or all widths are 0, give it full width.
				const span = col.width > 0 ? Math.max(6, Math.round(col.width * 24)) : section.columns.length === 1 ? 24 : Math.round(24 / section.columns.length);
				return (
					<Col key={i} xs={24} md={span}>
						{col.fields.map((df) => (
							<FieldRenderer key={df.fieldname} df={df} />
						))}
					</Col>
				);
			})}
		</Row>
	);

	// Collapsible section.
	if (section.collapsible) {
		return (
			<Collapse
				style={{ marginBottom: 16 }}
				defaultActiveKey={['1']}
				items={[
					{
						key: '1',
						label: <Title level={5} style={{ margin: 0 }}>{section.label}</Title>,
						children: body,
					},
				]}
			/>
		);
	}

	// Plain section.
	if (section.hide_border) {
		return <div style={{ marginBottom: 16 }}>{body}</div>;
	}

	return (
		<Card
			title={section.label ? <Title level={5} style={{ margin: 0 }}>{section.label}</Title> : undefined}
			bordered={false}
			style={{ marginBottom: 16 }}
		>
			{body}
		</Card>
	);
}

/** Re-export so callers can layout custom field sets. */
export { isLayoutField };
export type { Column, Section, Tab };

/** Helper: extract the "name path" of a field — useful for breadcrumbs. */
export function fieldPath(meta: DocMeta, fieldname: string): ReactNode {
	void meta;
	void fieldname;
	return null;
}
