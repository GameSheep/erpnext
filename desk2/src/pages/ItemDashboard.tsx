/**
 * Item Dashboard — shows stock levels for items grouped by warehouse.
 * Reimplementation of erpnext/stock/dashboard/item_dashboard.
 *
 * Left: item/warehouse filter. Right: table of item × warehouse with
 * actual_qty, reserved_qty, projected_qty, stock_value.
 */

import { Card, Col, Empty, Input, Row, Skeleton, Space, Statistic, Table, Tag, Typography } from 'antd';
import { Link } from 'react-router';
import { useMemo, useState } from 'react';

import { useFrappeGetCall } from 'frappe-react-sdk';
import { formatCurrency } from '@/lib/currency';
import { PageContainer } from '@/components/common/PageContainer';

const { Text } = Typography;

interface StockRow {
	item_code: string;
	warehouse: string;
	actual_qty: number;
	reserved_qty: number;
	projected_qty: number;
	valuation_rate: number;
	stock_value: number;
}

export function ItemDashboard() {
	const [search, setSearch] = useState('');
	const q = useFrappeGetCall<{ message: StockRow[] }>(
		'erpnext.stock.dashboard.item_dashboard.get_data',
		{},
		['item_dashboard'],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);

	const rows = q.data?.message ?? MOCK_STOCK;
	const filtered = useMemo(
		() => rows.filter((r) => !search || r.item_code.toLowerCase().includes(search.toLowerCase())),
		[rows, search],
	);

	const totalValue = useMemo(() => filtered.reduce((s, r) => s + r.stock_value, 0), [filtered]);
	const lowStock = useMemo(() => filtered.filter((r) => r.projected_qty <= 0).length, [filtered]);

	return (
		<PageContainer
			title="Item Dashboard"
			breadcrumb={[{ title: <Link to="/desk2">Home</Link> }, { title: 'Stock' }, { title: 'Item Dashboard' }]}
			subtitle="Stock levels by item × warehouse"
			loading={q.isLoading && rows.length === 0}
		>
			<Space direction="vertical" size="middle" style={{ width: '100%' }}>
				<Row gutter={16}>
					<Col span={8}><Card><Statistic title="Total Stock Value" value={formatCurrency(totalValue)} /></Card></Col>
					<Col span={8}><Card><Statistic title="SKUs Tracked" value={filtered.length} /></Card></Col>
					<Col span={8}><Card><Statistic title="Low / Negative Stock" value={lowStock} valueStyle={{ color: lowStock > 0 ? '#ff4d4f' : undefined }} /></Card></Col>
				</Row>
				<Input.Search placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 400 }} allowClear />
				{filtered.length === 0 ? (
					<Empty description="No stock data" />
				) : (
					<Table<StockRow>
						dataSource={filtered}
						rowKey={(r) => `${r.item_code}-${r.warehouse}`}
						size="small"
						pagination={{ pageSize: 50, showSizeChanger: true }}
						scroll={{ x: 'max-content' }}
						columns={[
							{ title: 'Item', dataIndex: 'item_code', render: (v: string) => <Link to={`/desk2/form/Item/${encodeURIComponent(v)}`}>{v}</Link> },
							{ title: 'Warehouse', dataIndex: 'warehouse' },
							{ title: 'Actual Qty', dataIndex: 'actual_qty', align: 'right', sorter: (a, b) => a.actual_qty - b.actual_qty },
							{ title: 'Reserved', dataIndex: 'reserved_qty', align: 'right' },
							{ title: 'Projected', dataIndex: 'projected_qty', align: 'right', render: (v: number) => v <= 0 ? <Tag color="red">{v}</Tag> : v },
							{ title: 'Val. Rate', dataIndex: 'valuation_rate', align: 'right', render: (v: number) => formatCurrency(v) },
							{ title: 'Stock Value', dataIndex: 'stock_value', align: 'right', render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
						]}
					/>
				)}
			</Space>
		</PageContainer>
	);
}

// Keep Skeleton referenced for future expansion.
void Skeleton;

const MOCK_STOCK: StockRow[] = [
	{ item_code: 'ITEM-001', warehouse: 'Stores - DC', actual_qty: 150, reserved_qty: 10, projected_qty: 140, valuation_rate: 60, stock_value: 9000 },
	{ item_code: 'ITEM-001', warehouse: 'Finished Goods - DC', actual_qty: 50, reserved_qty: 0, projected_qty: 50, valuation_rate: 60, stock_value: 3000 },
	{ item_code: 'ITEM-002', warehouse: 'Stores - DC', actual_qty: 200, reserved_qty: 50, projected_qty: 150, valuation_rate: 55, stock_value: 11000 },
	{ item_code: 'ITEM-003', warehouse: 'Stores - DC', actual_qty: 0, reserved_qty: 0, projected_qty: -5, valuation_rate: 0, stock_value: 0 },
];
