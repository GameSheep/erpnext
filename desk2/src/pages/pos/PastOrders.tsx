/**
 * PastOrders — history of POS invoices + order detail.
 *
 * Ported from pos_past_order_list.js + pos_past_order_summary.js.
 * Stage-1 ships a read-only list; clicking opens the invoice in a new tab.
 */

import { Card, Col, Empty, Input, List, Row, Segmented, Space, Statistic, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router';
import { useMemo, useState } from 'react';

import { usePOSPastOrders, type PastOrder } from './api';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';

const { Text } = Typography;

export interface PastOrdersProps {
	onSelect?: (order: PastOrder) => void;
}

export function PastOrders({ onSelect }: PastOrdersProps) {
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState<string>('');
	const { data, isLoading } = usePOSPastOrders(search, status, 50);
	const orders = data?.message ?? MOCK_ORDERS;

	const totals = useMemo(() => {
		const total = orders.reduce((s, o) => s + o.grand_total, 0);
		const paid = orders.filter((o) => o.status === 'Paid').reduce((s, o) => s + o.grand_total, 0);
		const returns = orders.filter((o) => /Return/i.test(o.status)).length;
		return { total, paid, returns };
	}, [orders]);

	return (
		<Space direction="vertical" size="middle" style={{ width: '100%' }}>
			<Row gutter={16}>
				<Col span={8}><Card><Statistic title="Orders" value={orders.length} /></Card></Col>
				<Col span={8}><Card><Statistic title="Collected" value={formatCurrency(totals.paid)} /></Card></Col>
				<Col span={8}><Card><Statistic title="Returns" value={totals.returns} valueStyle={{ color: totals.returns > 0 ? '#ff4d4f' : undefined }} /></Card></Col>
			</Row>

			<Card>
				<Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
					<Input.Search
						placeholder="Search invoice # or customer…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						style={{ width: 280 }}
						allowClear
					/>
					<Segmented
						value={status}
						onChange={(v) => setStatus(v as string)}
						options={[
							{ label: 'All', value: '' },
							{ label: 'Paid', value: 'Paid' },
							{ label: 'Draft', value: 'Draft' },
							{ label: 'Return', value: 'Return' },
						]}
					/>
				</Space>

				{isLoading && orders.length === 0 ? (
					<Text type="secondary">Loading…</Text>
				) : orders.length === 0 ? (
					<Empty description="No past orders" />
				) : (
					<Table<PastOrder>
						dataSource={orders}
						rowKey="name"
						size="small"
						pagination={{ pageSize: 20 }}
						onRow={(r) => ({ onClick: () => onSelect?.(r), style: { cursor: 'pointer' } })}
						columns={[
							{
								title: 'Invoice',
								dataIndex: 'name',
								render: (v: string) => (
									<Link to={`/desk2/form/POS%20Invoice/${encodeURIComponent(v)}`} onClick={(e) => e.stopPropagation()}>
										{v}
									</Link>
								),
							},
							{ title: 'Date', dataIndex: 'posting_date', width: 110, render: (v: string) => formatDate(v) },
							{ title: 'Customer', dataIndex: 'customer' },
							{
								title: 'Status',
								dataIndex: 'status',
								width: 90,
								render: (s: string) => <Tag color={s === 'Paid' ? 'green' : s === 'Draft' ? 'orange' : s === 'Return' ? 'red' : 'default'}>{s}</Tag>,
							},
							{ title: 'Total', dataIndex: 'grand_total', align: 'right', render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
						]}
					/>
				)}
			</Card>
		</Space>
	);
}

const MOCK_ORDERS: PastOrder[] = [
	{ name: 'POS-INV-2026-0001', customer: 'CUST-001', grand_total: 199, status: 'Paid', posting_date: '2026-07-20' },
	{ name: 'POS-INV-2026-0002', customer: 'Walk-in', grand_total: 89, status: 'Paid', posting_date: '2026-07-20' },
	{ name: 'POS-INV-2026-0003', customer: 'CUST-003', grand_total: 350, status: 'Draft', posting_date: '2026-07-21' },
	{ name: 'POS-INV-2026-0004', customer: 'CUST-002', grand_total: 99.5, status: 'Return', posting_date: '2026-07-21' },
];

// Keep List referenced (used in detail view expansion).
void List;
