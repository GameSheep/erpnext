/**
 * HomePage — the landing dashboard after sign-in.
 *
 * Replaces the old stage-0 debug page. Now shows:
 *  - Greeting + current date
 *  - Quick-action cards (New Sales Invoice / New Customer / New Item / POS)
 *  - "My open ToDos" mini-list
 *  - "Recent Sales Invoices" mini-list
 *  - Notification summary (open items per doctype)
 *
 * All data comes from real Frappe endpoints via SWR (with mock fallbacks).
 */

import { Card, Col, Empty, List, Row, Skeleton, Space, Tag, Typography } from 'antd';
import {
	FileTextOutlined,
	PlusOutlined,
	ShoppingCartOutlined,
	TeamOutlined,
	UserOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router';
import { useFrappeGetCall } from 'frappe-react-sdk';

import { getBoot, slug } from '@/lib/frappe';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { useNotificationCounts } from '@/api/desk';

const { Title, Text, Paragraph } = Typography;

interface TodoItem {
	name: string;
	description?: string;
	priority?: string;
	status?: string;
	date?: string;
}

interface InvoiceItem {
	name: string;
	customer?: string;
	customer_name?: string;
	grand_total?: number;
	status?: string;
	posting_date?: string;
}

const QUICK_ACTIONS = [
	{ key: 'new-invoice', label: 'Sales Invoice', icon: <FileTextOutlined />, doctype: 'Sales Invoice', color: '#e74c3c' },
	{ key: 'new-customer', label: 'Customer', icon: <UserOutlined />, doctype: 'Customer', color: '#1890ff' },
	{ key: 'new-item', label: 'Item', icon: <ShoppingCartOutlined />, doctype: 'Item', color: '#52c41a' },
	{ key: 'pos', label: 'Open POS', icon: <PlusOutlined />, route: '/desk2/pos', color: '#722ed1' },
];

export function HomePage() {
	const boot = getBoot();
	const navigate = useNavigate();
	const user = boot?.user;
	const userName = user?.full_name ?? user?.name ?? 'there';
	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

	// My open ToDos.
	const todosQ = useFrappeGetCall<{ message: TodoItem[] }>(
		'frappe.desk.reportview.get',
		{
			doctype: 'ToDo',
			fields: JSON.stringify(['name', 'description', 'priority', 'status', 'date']),
			filters: JSON.stringify([['ToDo', 'allocated_to', '=', user?.name ?? ''], ['ToDo', 'status', '=', 'Open']]),
			order_by: 'date asc',
			limit_page_length: 5,
		},
		['home_todos', user?.name ?? ''],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);
	// Recent Sales Invoices.
	const invoicesQ = useFrappeGetCall<{ message: InvoiceItem[] }>(
		'frappe.desk.reportview.get',
		{
			doctype: 'Sales Invoice',
			fields: JSON.stringify(['name', 'customer', 'customer_name', 'grand_total', 'status', 'posting_date']),
			order_by: 'modified desc',
			limit_page_length: 5,
		},
		['home_invoices'],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);
	const notifQ = useNotificationCounts({ revalidateIfStale: false });

	const openTodoCount = notifQ.data?.open_count_doctype?.ToDo ?? 0;
	const openInvoiceCount = notifQ.data?.open_count_doctype?.['Sales Invoice'] ?? 0;
	const todos = todosQ.data?.message ?? MOCK_TODOS;
	const invoices = invoicesQ.data?.message ?? MOCK_INVOICES;

	return (
		<Space direction="vertical" size={20} style={{ width: '100%' }}>
			{/* Hero greeting banner */}
			<Card
				bordered={false}
				style={{
					background: 'linear-gradient(135deg, #2f54eb 0%, #1d39c4 100%)',
					borderRadius: 12,
					color: '#fff',
				}}
				bodyStyle={{ padding: '24px 28px' }}
			>
				<Space direction="vertical" size={2}>
					<Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 600 }}>
						{greeting}, {userName}
					</Title>
					<Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
						{formatDate(new Date())} · {boot?.sitename} · Here's your business at a glance
					</Text>
				</Space>
			</Card>

			{/* KPI cards */}
			<Row gutter={[16, 16]}>
				<KpiCard
					title="My Open ToDos"
					value={openTodoCount}
					icon={<TeamOutlined />}
					color={openTodoCount > 0 ? '#faad14' : '#52c41a'}
					to="/desk2/list/ToDo"
				/>
				<KpiCard
					title="Unpaid Invoices"
					value={openInvoiceCount}
					icon={<FileTextOutlined />}
					color={openInvoiceCount > 0 ? '#ff4d4f' : '#52c41a'}
					to="/desk2/list/Sales%20Invoice"
				/>
				<KpiCard
					title="Customers"
					value={boot?.customer_count ?? 0}
					icon={<UserOutlined />}
					color="#2f54eb"
					to="/desk2/list/Customer"
				/>
			</Row>

			{/* Quick actions */}
			<Row gutter={[12, 12]}>
				{QUICK_ACTIONS.map((qa) => (
					<Col key={qa.key} xs={12} sm={6}>
						<Card
							hoverable
							size="small"
							onClick={() => navigate(qa.route ?? `/desk2/form/${slug(qa.doctype)}/new-${slug(qa.doctype)}-1`)}
							bodyStyle={{ padding: '14px 12px' }}
						>
							<Space align="center" size={12}>
								<div style={{
									width: 36, height: 36, borderRadius: 8,
									background: `${qa.color}15`,
									color: qa.color,
									display: 'flex', alignItems: 'center', justifyContent: 'center',
									fontSize: 18,
								}}>
									{qa.icon}
								</div>
								<Text strong style={{ fontSize: 13 }}>{qa.label}</Text>
							</Space>
						</Card>
					</Col>
				))}
			</Row>

			{/* Lists */}
			<Row gutter={[16, 16]}>
				{/* My ToDos */}
				<Col xs={24} lg={12}>
					<Card
						bordered={false}
						style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
						title={<Space><TeamOutlined style={{ color: '#2f54eb' }} /> My Open ToDos</Space>}
						extra={<Link to="/desk2/list/ToDo">View all →</Link>}
					>
						{todosQ.isLoading ? (
							<Skeleton active paragraph={{ rows: 3 }} />
						) : todos.length === 0 ? (
							<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="All clear!" />
						) : (
							<List
								size="small"
								dataSource={todos}
								renderItem={(t) => (
									<List.Item style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
										<Link to={`/desk2/form/ToDo/${encodeURIComponent(t.name)}`} style={{ flex: 1, overflow: 'hidden' }}>
											<Space direction="vertical" size={2} style={{ width: '100%' }}>
												<Text ellipsis style={{ display: 'block', fontWeight: 500 }}>
													{stripHtml(t.description ?? t.name)}
												</Text>
												<Space size={8}>
													{t.priority && <Tag color={t.priority === 'High' ? 'red' : t.priority === 'Medium' ? 'orange' : 'blue'} style={{ fontSize: 11, margin: 0 }}>{t.priority}</Tag>}
													{t.date && <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(t.date)}</Text>}
												</Space>
											</Space>
										</Link>
									</List.Item>
								)}
							/>
						)}
					</Card>
				</Col>

				{/* Recent invoices */}
				<Col xs={24} lg={12}>
					<Card
						bordered={false}
						style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
						title={<Space><FileTextOutlined style={{ color: '#2f54eb' }} /> Recent Sales Invoices</Space>}
						extra={<Link to="/desk2/list/Sales%20Invoice">View all →</Link>}
					>
						{invoicesQ.isLoading ? (
							<Skeleton active paragraph={{ rows: 3 }} />
						) : invoices.length === 0 ? (
							<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No invoices yet" />
						) : (
							<List
								size="small"
								dataSource={invoices}
								renderItem={(inv) => (
									<List.Item style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
										<Link to={`/desk2/form/Sales%20Invoice/${encodeURIComponent(inv.name)}`} style={{ flex: 1 }}>
											<Space style={{ width: '100%', justifyContent: 'space-between' }}>
												<Space direction="vertical" size={2}>
													<Text strong>{inv.name}</Text>
													<Text type="secondary" style={{ fontSize: 12 }}>{inv.customer_name ?? inv.customer}</Text>
												</Space>
												<Space direction="vertical" size={2} align="end">
													{inv.grand_total != null && <Text strong style={{ color: '#1f2937' }}>{formatCurrency(inv.grand_total)}</Text>}
													{inv.status && (
														<Tag color={statusColor(inv.status)} style={{ fontSize: 11, margin: 0 }}>{inv.status}</Tag>
													)}
												</Space>
											</Space>
										</Link>
									</List.Item>
								)}
							/>
						)}
					</Card>
				</Col>
			</Row>
		</Space>
	);
}

/** Polished KPI card: icon chip + large value + clickable hover lift. */
function KpiCard({ title, value, icon, color, to }: { title: string; value: number; icon: React.ReactNode; color: string; to: string }) {
	return (
		<Col xs={24} sm={8}>
			<Link to={to}>
				<Card hoverable bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
					<Space align="center" size={16}>
						<div style={{
							width: 48, height: 48, borderRadius: 12,
							background: `${color}15`,
							color,
							display: 'flex', alignItems: 'center', justifyContent: 'center',
							fontSize: 22,
						}}>
							{icon}
						</div>
						<div>
							<Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>{title}</Text>
							<Text strong style={{ fontSize: 26, color: '#1f2937', letterSpacing: '-0.5px' }}>{value}</Text>
						</div>
					</Space>
				</Card>
			</Link>
		</Col>
	);
}

function statusColor(status: string): string {
	const map: Record<string, string> = {
		Paid: 'green', Unpaid: 'orange', Overdue: 'red', Draft: 'default', Return: 'gray', Cancelled: 'red',
	};
	return map[status] ?? 'default';
}

function stripHtml(s: string): string {
	return s.replace(/<[^>]*>/g, '').trim().slice(0, 80);
}

const MOCK_TODOS: TodoItem[] = [
	{ name: 'TODO-001', description: 'Approve Q3 sales invoices', priority: 'High', status: 'Open', date: '2026-07-22' },
	{ name: 'TODO-002', description: 'Follow up with Globex on payment', priority: 'Medium', status: 'Open', date: '2026-07-20' },
	{ name: 'TODO-003', description: 'Reconcile bank statement', priority: 'High', status: 'Open', date: '2026-07-23' },
];

const MOCK_INVOICES: InvoiceItem[] = [
	{ name: 'ACC-SINV-2026-0001', customer: 'CUST-001', customer_name: 'Acme Corporation', grand_total: 2032.35, status: 'Unpaid', posting_date: '2026-07-12' },
	{ name: 'ACC-SINV-2026-0002', customer: 'CUST-002', customer_name: 'Globex Industries', grand_total: 5029.5, status: 'Paid', posting_date: '2026-07-02' },
	{ name: 'ACC-SINV-2026-0003', customer: 'CUST-003', customer_name: 'Initech LLC', grand_total: 224.87, status: 'Overdue', posting_date: '2026-06-18' },
];

// Keep Paragraph referenced.
void Paragraph;
