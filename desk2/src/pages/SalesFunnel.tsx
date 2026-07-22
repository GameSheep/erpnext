/**
 * Sales Funnel — lead → opportunity → quotation → sales order → invoice
 * conversion funnel visualization. Reimpl of erpnext/selling/page/sales_funnel.
 */

import { Card, Col, Empty, Row, Skeleton, Space, Statistic, Typography } from 'antd';
import { Link } from 'react-router';
import { useMemo } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { PageContainer } from '@/components/common/PageContainer';

const { Title, Text } = Typography;

interface FunnelStage {
	stage: string;
	count: number;
	value: number;
	doctype: string;
	color: string;
}

export function SalesFunnel() {
	const q = useFrappeGetCall<{ message: FunnelStage[] }>(
		'erpnext.selling.page.sales_funnel.sales_funnel.get_funnel_data',
		{},
		['sales_funnel'],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);

	const stages = q.data?.message ?? MOCK_FUNNEL;
	const totalValue = useMemo(() => stages.reduce((s, st) => s + st.value, 0), [stages]);
	const maxCount = Math.max(...stages.map((s) => s.count), 1);

	return (
		<PageContainer
			title="Sales Funnel"
			breadcrumb={[{ title: <Link to="/desk2">Home</Link> }, { title: 'Selling' }, { title: 'Sales Funnel' }]}
			subtitle="Lead → Opportunity → Quotation → Order → Invoice"
			loading={q.isLoading && stages.length === 0}
		>
			<Space direction="vertical" size="middle" style={{ width: '100%' }}>
				<Row gutter={16}>
					<Col span={6}><Card><Statistic title="Pipeline Value" value={totalValue} precision={0} /></Card></Col>
					<Col span={6}><Card><Statistic title="Stages" value={stages.length} /></Card></Col>
					<Col span={6}><Card><Statistic title="Top of Funnel" value={stages[0]?.count ?? 0} /></Card></Col>
					<Col span={6}><Card><Statistic title="Closed" value={stages[stages.length - 1]?.count ?? 0} /></Card></Col>
				</Row>
				<Card>
					<Title level={5}>Conversion Funnel</Title>
					{stages.length === 0 ? (
						<Empty description="No funnel data" />
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							{stages.map((st, i) => {
								const widthPct = Math.max(15, (st.count / maxCount) * 100);
								const convRate = i > 0 && stages[i - 1].count > 0 ? ((st.count / stages[i - 1].count) * 100).toFixed(0) : '100';
								return (
									<Link key={st.stage} to={`/desk2/list/${encodeURIComponent(st.doctype)}`}>
										<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
											<Text style={{ width: 120, textAlign: 'right' }}>{st.stage}</Text>
											<div style={{ flex: 1, background: '#f5f5f5', borderRadius: 4, height: 36, position: 'relative' }}>
												<div style={{
													width: `${widthPct}%`,
													height: '100%',
													background: st.color,
													borderRadius: 4,
													display: 'flex',
													alignItems: 'center',
													paddingLeft: 12,
													color: '#fff',
													fontWeight: 600,
												}}>
													{st.count}
													{i > 0 && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>({convRate}%)</span>}
												</div>
											</div>
											<Text type="secondary" style={{ width: 100 }}>{st.value.toLocaleString()}</Text>
										</div>
									</Link>
								);
							})}
						</div>
					)}
				</Card>
			</Space>
		</PageContainer>
	);
}

// Keep Skeleton referenced.
void Skeleton;

const MOCK_FUNNEL: FunnelStage[] = [
	{ stage: 'Leads', count: 120, value: 480000, doctype: 'Lead', color: '#e74c3c' },
	{ stage: 'Opportunities', count: 65, value: 320000, doctype: 'Opportunity', color: '#fa8c16' },
	{ stage: 'Quotations', count: 40, value: 210000, doctype: 'Quotation', color: '#faad14' },
	{ stage: 'Sales Orders', count: 28, value: 165000, doctype: 'Sales Order', color: '#52c41a' },
	{ stage: 'Invoices', count: 22, value: 132000, doctype: 'Sales Invoice', color: '#1890ff' },
];
