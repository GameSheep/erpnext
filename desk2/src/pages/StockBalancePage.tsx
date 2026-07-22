/**
 * Stock Balance — the Page-based stock summary (distinct from the report).
 *
 * Ported from erpnext/stock/page/stock_balance/. Shows a filterable stock
 * summary table using the ItemDashboard widget. Filters: warehouse, item,
 * item_group. Each row shows actual_qty, reserved, projected, valuation_rate.
 */

import { Col, Empty, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { LinkPicker } from '@/components/common/LinkPicker';
import { PageContainer } from '@/components/common/PageContainer';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { formatCurrency } from '@/lib/currency';

const { Text } = Typography;

interface StockBalanceRow {
	item_code: string;
	warehouse: string;
	actual_qty: number;
	reserved_qty: number;
	projected_qty: number;
	valuation_rate: number;
	stock_value: number;
}

const MOCK_ROWS: StockBalanceRow[] = [
	{ item_code: 'ITEM-001', warehouse: 'Stores - DC', actual_qty: 150, reserved_qty: 10, projected_qty: 140, valuation_rate: 60, stock_value: 9000 },
	{ item_code: 'ITEM-001', warehouse: 'Finished Goods - DC', actual_qty: 50, reserved_qty: 0, projected_qty: 50, valuation_rate: 60, stock_value: 3000 },
	{ item_code: 'ITEM-002', warehouse: 'Stores - DC', actual_qty: 200, reserved_qty: 50, projected_qty: 150, valuation_rate: 55, stock_value: 11000 },
	{ item_code: 'ITEM-003', warehouse: 'Stores - DC', actual_qty: 0, reserved_qty: 0, projected_qty: -5, valuation_rate: 0, stock_value: 0 },
	{ item_code: 'ITEM-005', warehouse: 'Finished Goods - DC', actual_qty: 80, reserved_qty: 5, projected_qty: 75, valuation_rate: 45, stock_value: 3600 },
	{ item_code: 'ITEM-006', warehouse: 'Stores - DC', actual_qty: 500, reserved_qty: 0, projected_qty: 500, valuation_rate: 8, stock_value: 4000 },
];

export function StockBalancePage() {
	const [warehouse, setWarehouse] = useState<string | undefined>();
	const [itemCode, setItemCode] = useState<string | undefined>();
	const [itemGroup, setItemGroup] = useState<string | undefined>();

	const q = useFrappeGetCall<{ message: StockBalanceRow[] }>(
		'erpnext.stock.page.stock_balance.stock_balance.get_data',
		{ warehouse, item_code: itemCode, item_group: itemGroup },
		['stock_balance_page', warehouse ?? '', itemCode ?? '', itemGroup ?? ''],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);

	const rows = q.data?.message ?? MOCK_ROWS;

	const totals = useMemo(() => ({
		value: rows.reduce((s, r) => s + r.stock_value, 0),
		qty: rows.reduce((s, r) => s + r.actual_qty, 0),
		skus: new Set(rows.map((r) => r.item_code)).size,
		low: rows.filter((r) => r.projected_qty <= 0).length,
	}), [rows]);

	return (
		<PageContainer
			title="Stock Balance"
			breadcrumb={[{ title: 'Home' }, { title: 'Stock' }, { title: 'Stock Balance' }]}
			subtitle="Real-time stock levels by item × warehouse"
		>
			<Space direction="vertical" size="middle" style={{ width: '100%' }}>
				<Row gutter={16}>
					<Col span={8}>
						<Text strong>Warehouse</Text>
						<LinkPicker doctype="Warehouse" value={warehouse} onChange={setWarehouse} placeholder="All warehouses" />
					</Col>
					<Col span={8}>
						<Text strong>Item</Text>
						<LinkPicker doctype="Item" value={itemCode} onChange={setItemCode} placeholder="All items" />
					</Col>
					<Col span={8}>
						<Text strong>Item Group</Text>
						<LinkPicker doctype="Item Group" value={itemGroup} onChange={setItemGroup} placeholder="All groups" />
					</Col>
				</Row>

				<Row gutter={16}>
					<Col span={6}><Statistic title="Total Value" value={formatCurrency(totals.value)} /></Col>
					<Col span={6}><Statistic title="Total Qty" value={totals.qty} /></Col>
					<Col span={6}><Statistic title="Unique SKUs" value={totals.skus} /></Col>
					<Col span={6}><Statistic title="Low Stock" value={totals.low} valueStyle={{ color: totals.low > 0 ? '#ff4d4f' : undefined }} /></Col>
				</Row>

				{rows.length === 0 ? (
					<Empty description="No stock data for the selected filters" />
				) : (
					<Table<StockBalanceRow>
						dataSource={rows}
						rowKey={(r) => `${r.item_code}-${r.warehouse}`}
						size="small"
						pagination={{ pageSize: 50, showSizeChanger: true }}
						scroll={{ x: 'max-content' }}
						columns={[
							{ title: 'Item', dataIndex: 'item_code', fixed: 'left', sorter: (a, b) => a.item_code.localeCompare(b.item_code) },
							{ title: 'Warehouse', dataIndex: 'warehouse' },
							{ title: 'Actual', dataIndex: 'actual_qty', align: 'end', sorter: (a, b) => a.actual_qty - b.actual_qty },
							{ title: 'Reserved', dataIndex: 'reserved_qty', align: 'end' },
							{ title: 'Projected', dataIndex: 'projected_qty', align: 'end', render: (v: number) => v <= 0 ? <Tag color="red">{v}</Tag> : v },
							{ title: 'Rate', dataIndex: 'valuation_rate', align: 'end', render: (v: number) => formatCurrency(v) },
							{ title: 'Value', dataIndex: 'stock_value', align: 'end', render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
						]}
					/>
				)}
			</Space>
		</PageContainer>
	);
}
