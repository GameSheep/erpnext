/**
 * BOM Comparison Tool — compare two BOMs side by side.
 *
 * Ported from erpnext/manufacturing/page/bom_comparison_tool/.
 * Picks two BOMs via Link fields, calls `erpnext.manufacturing.doctype.bom.bom.get_bom_diff`,
 * and renders the diff as three tables: changed values, added items, removed items.
 */

import { Col, Empty, Row, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';

import { LinkPicker } from '@/components/common/LinkPicker';
import { PageContainer } from '@/components/common/PageContainer';
import { useFrappeGetCall } from 'frappe-react-sdk';

const { Text, Title } = Typography;

interface BomDiff {
	changed?: Record<string, Array<[string, unknown, unknown]>>;
	added?: Record<string, Array<Record<string, unknown>>>;
	removed?: Record<string, Array<Record<string, unknown>>>;
}

export function BOMComparison() {
	const [bom1, setBom1] = useState<string | undefined>();
	const [bom2, setBom2] = useState<string | undefined>();

	const diffQ = useFrappeGetCall<{ message: BomDiff }>(
		'erpnext.manufacturing.doctype.bom.bom.get_bom_diff',
		{ bom1, bom2 },
		bom1 && bom2 ? ['bom_diff', bom1, bom2] : null,
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);

	const diff = diffQ.data?.message;

	return (
		<PageContainer
			title="BOM Comparison Tool"
			breadcrumb={[{ title: 'Home' }, { title: 'Manufacturing' }, { title: 'BOM Comparison' }]}
			subtitle="Compare two Bills of Material side by side"
		>
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				{/* Pickers */}
				<Row gutter={16}>
					<Col span={10}>
						<Text strong>BOM 1</Text>
						<LinkPicker doctype="BOM" value={bom1} onChange={(v) => setBom1(v)} placeholder="Select first BOM" />
					</Col>
					<Col span={10}>
						<Text strong>BOM 2</Text>
						<LinkPicker doctype="BOM" value={bom2} onChange={(v) => setBom2(v)} placeholder="Select second BOM" />
					</Col>
				</Row>

				{!bom1 || !bom2 ? (
					<Empty description="Select two BOMs to compare" />
				) : diffQ.isLoading ? (
					<Text type="secondary">Comparing…</Text>
				) : !diff ? (
					<Empty description="No diff data" />
				) : (
					<DiffResult diff={diff} name1={bom1} name2={bom2} />
				)}
			</Space>
		</PageContainer>
	);
}

function DiffResult({ diff, name1, name2 }: { diff: BomDiff; name1: string; name2: string }) {
	return (
		<Space direction="vertical" size="middle" style={{ width: '100%' }}>
			{/* Changed values */}
			{Object.entries(diff.changed ?? {}).map(([doctype, changes]) =>
				changes.length === 0 ? null : (
					<div key={`changed-${doctype}`}>
						<Title level={5}>Changed — {doctype}</Title>
						<Table
							size="small"
							pagination={false}
							dataSource={changes.map((c, i) => ({ key: i, field: c[0], val1: c[1], val2: c[2] }))}
							columns={[
								{ title: 'Field', dataIndex: 'field', width: '33%' },
								{ title: name1, dataIndex: 'val1', width: '33%', render: (v: unknown) => <Text>{String(v ?? '—')}</Text> },
								{ title: name2, dataIndex: 'val2', width: '33%', render: (v: unknown) => <Text strong>{String(v ?? '—')}</Text> },
							]}
						/>
					</div>
				),
			)}

			{/* Added items */}
			{Object.entries(diff.added ?? {}).map(([doctype, items]) =>
				items.length === 0 ? null : (
					<div key={`added-${doctype}`}>
						<Title level={5}>Added in {name2} — {doctype} <Tag color="green">{items.length}</Tag></Title>
						<GenericItemsTable items={items} />
					</div>
				),
			)}

			{/* Removed items */}
			{Object.entries(diff.removed ?? {}).map(([doctype, items]) =>
				items.length === 0 ? null : (
					<div key={`removed-${doctype}`}>
						<Title level={5}>Removed from {name2} — {doctype} <Tag color="red">{items.length}</Tag></Title>
						<GenericItemsTable items={items} />
					</div>
				),
			)}

			{!diff.changed && !diff.added && !diff.removed && (
				<Empty description="No differences found — BOMs are identical" />
			)}
		</Space>
	);
}

function GenericItemsTable({ items }: { items: Array<Record<string, unknown>> }) {
	const columns = items[0] ? Object.keys(items[0]).slice(0, 6).map((k) => ({ title: k, dataIndex: k })) : [];
	return (
		<Table
			size="small"
			pagination={false}
			dataSource={items.map((it, i) => ({ ...it, key: i }))}
			columns={columns}
			scroll={{ x: 'max-content' }}
		/>
	);
}
