/**
 * Shop Floor — manufacturing operator dashboard.
 *
 * Shows active Work Orders + their Job Cards as a status board. Operators can
 * see what's in queue / in progress / completed, and (in a full impl) start /
 * pause / complete jobs.
 *
 * Stage-1 ships a read-only board with mock data. The full ERPNext Shop Floor
 * (public/js/shop_floor/) has timer, QR-scan, job-card submit — deferred.
 */

import { Card, Col, Empty, List, Row, Space, Statistic, Tag, Typography } from 'antd';
import { Link } from 'react-router';
import { useMemo } from 'react';

import { useFrappeGetCall } from 'frappe-react-sdk';
import { PageContainer } from '@/components/common/PageContainer';

const { Title, Text } = Typography;

interface JobCard {
	name: string;
	work_order: string;
	operation: string;
	workstation: string;
	status: 'Open' | 'Work In Progress' | 'Completed' | 'Material Transferred' | 'On Hold';
	qty_to_manufacture: number;
	total_completed_qty: number;
	employee?: string;
}

export function ShopFloor() {
	const jobsQ = useFrappeGetCall<{ message: JobCard[] }>(
		'erpnext.manufacturing.doctype.job_card.job_card.get_job_cards_for_shop_floor',
		{},
		['shop_floor_jobs'],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);

	const jobs = jobsQ.data?.message ?? MOCK_JOBS;

	const byStatus = useMemo(() => {
		const groups: Record<string, JobCard[]> = {};
		for (const j of jobs) {
			(groups[j.status] ??= []).push(j);
		}
		return groups;
	}, [jobs]);

	const inProgress = (byStatus['Work In Progress'] ?? []).length;
	const open = (byStatus['Open'] ?? []).length;
	const done = (byStatus['Completed'] ?? []).length;

	return (
		<PageContainer
			title="Shop Floor"
			breadcrumb={[{ title: <Link to="/desk2">Home</Link> }, { title: 'Manufacturing' }, { title: 'Shop Floor' }]}
			subtitle="Active work orders & job cards"
		>
			<Space direction="vertical" size="middle" style={{ width: '100%' }}>
				<Row gutter={16}>
					<Col span={8}><Card><Statistic title="In Progress" value={inProgress} valueStyle={{ color: '#1890ff' }} /></Card></Col>
					<Col span={8}><Card><Statistic title="Open / Queued" value={open} valueStyle={{ color: '#faad14' }} /></Card></Col>
					<Col span={8}><Card><Statistic title="Completed Today" value={done} valueStyle={{ color: '#52c41a' }} /></Card></Col>
				</Row>

				<Row gutter={16}>
				{['Open', 'Work In Progress', 'Completed'].map((status) => (
					<Col key={status} xs={24} lg={8}>
						<Card title={<span>{status} <Tag>{(byStatus[status] ?? []).length}</Tag></span>} size="small" bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}>
							{(byStatus[status] ?? []).length === 0 ? (
								<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No jobs" />
							) : (
								<List
									dataSource={byStatus[status] ?? []}
										renderItem={(j) => (
											<Link to={`/desk2/form/Job%20Card/${encodeURIComponent(j.name)}`}>
												<Card size="small" hoverable style={{ marginBottom: 8 }}>
													<Space direction="vertical" size={2}>
														<Text strong>{j.operation}</Text>
														<Text type="secondary">{j.work_order} · {j.workstation}</Text>
														<Text type="secondary">{j.total_completed_qty} / {j.qty_to_manufacture} qty</Text>
													</Space>
												</Card>
											</Link>
										)}
								/>
							)}
						</Card>
					</Col>
				))}
				</Row>
			</Space>
		</PageContainer>
	);
}

const MOCK_JOBS: JobCard[] = [
	{ name: 'JC-001', work_order: 'WO-001', operation: 'Assembly', workstation: 'WS-01', status: 'Work In Progress', qty_to_manufacture: 100, total_completed_qty: 45 },
	{ name: 'JC-002', work_order: 'WO-002', operation: 'Welding', workstation: 'WS-02', status: 'Work In Progress', qty_to_manufacture: 50, total_completed_qty: 20 },
	{ name: 'JC-003', work_order: 'WO-003', operation: 'Painting', workstation: 'WS-03', status: 'Open', qty_to_manufacture: 200, total_completed_qty: 0 },
	{ name: 'JC-004', work_order: 'WO-004', operation: 'Quality Check', workstation: 'WS-04', status: 'Open', qty_to_manufacture: 30, total_completed_qty: 0 },
	{ name: 'JC-005', work_order: 'WO-001', operation: 'Packaging', workstation: 'WS-05', status: 'Completed', qty_to_manufacture: 100, total_completed_qty: 100 },
	{ name: 'JC-006', work_order: 'WO-005', operation: 'Testing', workstation: 'WS-06', status: 'Completed', qty_to_manufacture: 80, total_completed_qty: 80 },
];

// Keep Title referenced.
void Title;
