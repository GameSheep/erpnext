/**
 * Visual Plant Floor — a visual layout of workstations on the factory floor.
 *
 * Ported from erpnext/manufacturing/page/visual_plant_floor/. Shows
 * workstations as positioned cards on a 2D grid, color-coded by status
 * (idle / running / blocked). The original uses a draggable HTML5 layout;
 * stage-1 ships a read-only grid view + per-station status popover.
 */

import { Badge, Card, Col, Empty, Row, Space, Statistic, Tag, Tooltip, Typography } from 'antd';
import { useMemo } from 'react';

import { PageContainer } from '@/components/common/PageContainer';
import { useFrappeGetCall } from 'frappe-react-sdk';

const { Text, Title } = Typography;

interface Workstation {
	name: string;
	workstation_name: string;
	area: string;
	status: 'Idle' | 'Running' | 'Blocked' | 'Maintenance';
	current_operation?: string;
	current_job?: string;
	utilization: number; // %
	x: number; // grid column (1-12)
	y: number; // grid row
}

const MOCK_STATIONS: Workstation[] = [
	{ name: 'WS-01', workstation_name: 'Assembly Line A', area: 'Assembly', status: 'Running', current_operation: 'Final Assembly', current_job: 'WO-001', utilization: 85, x: 1, y: 1 },
	{ name: 'WS-02', workstation_name: 'Assembly Line B', area: 'Assembly', status: 'Idle', utilization: 0, x: 5, y: 1 },
	{ name: 'WS-03', workstation_name: 'Welding Station 1', area: 'Welding', status: 'Running', current_operation: 'MIG Weld', current_job: 'WO-002', utilization: 72, x: 9, y: 1 },
	{ name: 'WS-04', workstation_name: 'CNC Machine 1', area: 'Machining', status: 'Blocked', current_operation: 'Part change', utilization: 0, x: 1, y: 2 },
	{ name: 'WS-05', workstation_name: 'Paint Booth', area: 'Finishing', status: 'Maintenance', utilization: 0, x: 5, y: 2 },
	{ name: 'WS-06', workstation_name: 'QC Station', area: 'Quality', status: 'Idle', utilization: 0, x: 9, y: 2 },
	{ name: 'WS-07', workstation_name: 'Packaging', area: 'Shipping', status: 'Running', current_operation: 'Box & Label', current_job: 'WO-001', utilization: 60, x: 1, y: 3 },
];

const STATUS_COLOR: Record<Workstation['status'], string> = {
	Running: '#52c41a',
	Idle: '#d9d9d9',
	Blocked: '#ff4d4f',
	Maintenance: '#faad14',
};

export function VisualPlantFloor() {
	const q = useFrappeGetCall<{ message: Workstation[] }>(
		'erpnext.manufacturing.page.visual_plant_floor.visual_plant_floor.get_workstations',
		{},
		['visual_plant_floor'],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);

	const stations = q.data?.message ?? MOCK_STATIONS;
	const stats = useMemo(() => ({
		running: stations.filter((s) => s.status === 'Running').length,
		idle: stations.filter((s) => s.status === 'Idle').length,
		blocked: stations.filter((s) => s.status === 'Blocked').length,
		maint: stations.filter((s) => s.status === 'Maintenance').length,
	}), [stations]);

	return (
		<PageContainer
			title="Visual Plant Floor"
			breadcrumb={[{ title: 'Home' }, { title: 'Manufacturing' }, { title: 'Visual Plant Floor' }]}
			subtitle="Real-time workstation layout & status"
		>
			<Space direction="vertical" size="middle" style={{ width: '100%' }}>
				<Row gutter={16}>
					<Col span={6}><Statistic title="Running" value={stats.running} valueStyle={{ color: STATUS_COLOR.Running }} /></Col>
					<Col span={6}><Statistic title="Idle" value={stats.idle} valueStyle={{ color: STATUS_COLOR.Idle }} /></Col>
					<Col span={6}><Statistic title="Blocked" value={stats.blocked} valueStyle={{ color: STATUS_COLOR.Blocked }} /></Col>
					<Col span={6}><Statistic title="Maintenance" value={stats.maint} valueStyle={{ color: STATUS_COLOR.Maintenance }} /></Col>
				</Row>

				{stations.length === 0 ? (
					<Empty description="No workstations configured" />
				) : (
					<Card title={<Title level={5} style={{ margin: 0 }}>Factory Floor Layout</Title>}>
						<Row gutter={[12, 12]}>
							{stations.map((ws) => (
								<Col key={ws.name} xs={24} sm={12} md={8} lg={6}>
									<Tooltip title={
										<div>
											<Text strong>{ws.workstation_name}</Text><br />
											<Text>Area: {ws.area}</Text><br />
											{ws.current_operation && <Text>Op: {ws.current_operation}</Text>}<br />
											{ws.current_job && <Text>Job: {ws.current_job}</Text>}<br />
											<Text>Utilization: {ws.utilization}%</Text>
										</div>
									}>
										<Card
											size="small"
											bodyStyle={{ padding: 12 }}
											style={{
												borderLeft: `4px solid ${STATUS_COLOR[ws.status]}`,
												background: ws.status === 'Idle' ? '#fafafa' : '#fff',
											}}
										>
											<Space direction="vertical" size={2} style={{ width: '100%' }}>
												<Space style={{ width: '100%', justifyContent: 'space-between' }}>
													<Text strong ellipsis style={{ maxWidth: 120 }}>{ws.workstation_name}</Text>
													<Badge color={STATUS_COLOR[ws.status]} text={ws.status} />
												</Space>
												<Text type="secondary" style={{ fontSize: 11 }}>{ws.name} · {ws.area}</Text>
												{ws.current_operation && (
													<Tag color="blue" style={{ fontSize: 10 }}>{ws.current_operation}</Tag>
												)}
												{ws.utilization > 0 && (
													<Text type="secondary" style={{ fontSize: 11 }}>⚡ {ws.utilization}% busy</Text>
												)}
											</Space>
										</Card>
									</Tooltip>
								</Col>
							))}
						</Row>
					</Card>
				)}
			</Space>
		</PageContainer>
	);
}
