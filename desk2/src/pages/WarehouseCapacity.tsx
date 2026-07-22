/**
 * Warehouse Capacity Summary — shows warehouse utilization vs capacity.
 *
 * Ported from erpnext/stock/page/warehouse_capacity_summary/. Each warehouse
 * has a `capacity` (volume) and the page aggregates actual stock volume
 * against it, showing a utilization bar per warehouse.
 */

import { Col, Empty, Progress, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useMemo } from 'react';

import { PageContainer } from '@/components/common/PageContainer';
import { useFrappeGetCall } from 'frappe-react-sdk';

const { Text } = Typography;

interface CapacityRow {
	warehouse: string;
	warehouse_name: string;
	capacity: number; // max volume (m³)
	actual_qty_volume: number; // current stock volume
	utilization: number; // %
	company: string;
}

const MOCK_ROWS: CapacityRow[] = [
	{ warehouse: 'Stores - DC', warehouse_name: 'Main Store', capacity: 500, actual_qty_volume: 320, utilization: 64, company: 'Demo Company' },
	{ warehouse: 'Finished Goods - DC', warehouse_name: 'FG Store', capacity: 1000, actual_qty_volume: 890, utilization: 89, company: 'Demo Company' },
	{ warehouse: 'Raw Materials - DC', warehouse_name: 'Raw Store', capacity: 800, actual_qty_volume: 210, utilization: 26, company: 'Demo Company' },
	{ warehouse: 'Scrap - DC', warehouse_name: 'Scrap Yard', capacity: 200, actual_qty_volume: 195, utilization: 97, company: 'Demo Company' },
];

export function WarehouseCapacity() {
	const q = useFrappeGetCall<{ message: CapacityRow[] }>(
		'erpnext.stock.page.warehouse_capacity_summary.warehouse_capacity_summary.get_data',
		{},
		['warehouse_capacity'],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);

	const rows = q.data?.message ?? MOCK_ROWS;
	const summary = useMemo(() => {
		const totalCap = rows.reduce((s, r) => s + r.capacity, 0);
		const totalUsed = rows.reduce((s, r) => s + r.actual_qty_volume, 0);
		const overCapacity = rows.filter((r) => r.utilization >= 90).length;
		const avgUtil = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0;
		return { totalCap, totalUsed, overCapacity, avgUtil };
	}, [rows]);

	return (
		<PageContainer
			title="Warehouse Capacity Summary"
			breadcrumb={[{ title: 'Home' }, { title: 'Stock' }, { title: 'Warehouse Capacity' }]}
			subtitle="Stock volume vs warehouse capacity"
		>
			<Space direction="vertical" size="middle" style={{ width: '100%' }}>
				<Row gutter={16}>
					<Col span={6}><Statistic title="Total Capacity (m³)" value={summary.totalCap} /></Col>
					<Col span={6}><Statistic title="Used (m³)" value={summary.totalUsed} /></Col>
					<Col span={6}><Statistic title="Avg Utilization" value={summary.avgUtil} suffix="%" valueStyle={{ color: summary.avgUtil > 80 ? '#ff4d4f' : '#52c41a' }} /></Col>
					<Col span={6}><Statistic title="Near Capacity (≥90%)" value={summary.overCapacity} valueStyle={{ color: summary.overCapacity > 0 ? '#faad14' : undefined }} /></Col>
				</Row>

				{rows.length === 0 ? (
					<Empty description="No warehouse capacity data" />
				) : (
					<Table<CapacityRow>
						dataSource={rows}
						rowKey="warehouse"
						size="small"
						pagination={false}
						columns={[
							{ title: 'Warehouse', dataIndex: 'warehouse_name', render: (v: string, r) => <Space direction="vertical" size={0}><Text strong>{v}</Text><Text type="secondary" style={{ fontSize: 11 }}>{r.warehouse}</Text></Space> },
							{ title: 'Capacity (m³)', dataIndex: 'capacity', align: 'end' },
							{ title: 'Used (m³)', dataIndex: 'actual_qty_volume', align: 'end' },
							{
								title: 'Utilization',
								dataIndex: 'utilization',
								render: (v: number, r) => (
									<Space direction="vertical" size={2} style={{ width: 200 }}>
										<Progress
											percent={v}
											size="small"
											status={v >= 95 ? 'exception' : v >= 80 ? 'active' : 'normal'}
											format={() => `${v}%`}
										/>
										{v >= 90 && <Tag color={v >= 95 ? 'red' : 'orange'} style={{ fontSize: 10 }}>{v >= 95 ? 'Critical' : 'Near capacity'}</Tag>}
										<Text type="secondary" style={{ fontSize: 11 }}>{r.actual_qty_volume} / {r.capacity} m³</Text>
									</Space>
								),
							},
						]}
					/>
				)}
			</Space>
		</PageContainer>
	);
}
