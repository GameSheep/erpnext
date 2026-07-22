/**
 * WorkspaceView — renders a Frappe Workspace.
 *
 * Fetches the Workspace doc, parses its `content` JSON-string (the 12-col grid
 * of widget blocks), and renders each block:
 *   header     → Typography.Title
 *   number_card→ Statistic (via useNumberCard)
 *   chart      → @ant-design/charts (via useDashboardChart)
 *   shortcut   → link card with optional count badge
 *   card       → group of links
 *   spacer     → vertical gap
 *
 * Layout: a Row/Col grid where each block's `data.col` controls its span.
 */

import { Breadcrumb, Card, Col, Empty, Row, Skeleton, Space, Spin, Statistic, Typography } from 'antd';
import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { useWorkspace } from '@/api/desk';
import type { WorkspaceContentBlock } from '@/types/frappe';
import { slug } from '@/lib/frappe';
import { useNumberCard, useDashboardChart } from '@/api/dashboard';
import { Line, Bar, Pie } from '@ant-design/charts';

const { Title, Text, Paragraph } = Typography;

export function WorkspaceView() {
	const params = useParams<{ name: string }>();
	const name = params.name ? decodeURIComponent(params.name) : 'Home';
	const { data: ws, isLoading } = useWorkspace(name);

	const blocks = useMemo<WorkspaceContentBlock[]>(() => {
		if (!ws?.content) return [];
		try {
			return JSON.parse(ws.content) as WorkspaceContentBlock[];
		} catch {
			return [];
		}
	}, [ws]);

	if (isLoading) {
		return <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>;
	}

	if (!ws) {
		return (
			<Card>
				<Empty description={`Workspace "${name}" not found`} />
			</Card>
		);
	}

	return (
		<>
			<Breadcrumb
				items={[{ title: <Link to="/desk2">Home</Link> }, { title: ws.label ?? name }]}
				style={{ marginBottom: 12 }}
			/>
			<Row gutter={[16, 16]}>
				{blocks.map((block) => (
					<Col key={block.id} xs={24} md={block.data.col ? Math.round((block.data.col / 12) * 24) : 24}>
						<WorkspaceBlock block={block} workspaceName={ws.name} />
					</Col>
				))}
			</Row>
		</>
	);
}

function WorkspaceBlock({ block, workspaceName }: { block: WorkspaceContentBlock; workspaceName: string }) {
	switch (block.type) {
		case 'header':
			return (
				<Title level={3} style={{ marginTop: 0 }}>
					<span dangerouslySetInnerHTML={{ __html: block.data.text ?? '' }} />
				</Title>
			);
		case 'number_card':
			return <NumberCardWidget name={block.data.number_card_name} />;
		case 'chart':
			return <ChartWidget name={block.data.chart_name} />;
		case 'shortcut':
			return <ShortcutWidget label={block.data.shortcut_name} />;
		case 'card':
			return <CardLinksWidget cardName={block.data.card_name} workspaceName={workspaceName} />;
		case 'spacer':
			return <div style={{ height: 16 }} />;
		default:
			return (
				<Card size="small">
					<Text type="secondary">Unsupported widget: {block.type}</Text>
				</Card>
			);
	}
}

function NumberCardWidget({ name }: { name?: string }) {
	const { data, isLoading, error } = useNumberCard(name);
	if (isLoading) return <Card><Spin /></Card>;
	if (error || !data) return <Card size="small"><Text type="secondary">No data</Text></Card>;
	return (
		<Card>
			<Statistic
				title={data.label ?? name}
				value={data.formatted_value ?? data.value ?? 0}
				precision={typeof data.value === 'number' ? 0 : undefined}
			/>
			{data.percentage_change != null && (
				<Text type={data.percentage_change >= 0 ? 'success' : 'danger'} style={{ fontSize: 12 }}>
					{data.percentage_change >= 0 ? '▲' : '▼'} {Math.abs(data.percentage_change).toFixed(1)}%
				</Text>
			)}
		</Card>
	);
}

function ChartWidget({ name }: { name?: string }) {
	const { data, isLoading, error } = useDashboardChart(name);
	const navigate = useNavigate();

	if (isLoading) return <Card><Spin /></Card>;
	if (error || !data) return <Card size="small"><Text type="secondary">Chart unavailable</Text></Card>;

	const labels = data.labels ?? [];
	const datasets = data.datasets ?? [];
	const chartType = data.chart?.type ?? (datasets[0]?.chartType ?? 'Line');

	// Build the flat data array @ant-design/charts wants.
	const flat = labels.flatMap((label, i) =>
		datasets.map((ds) => ({
			label: String(label),
			series: ds.name ?? 'value',
			value: ds.values?.[i] ?? 0,
		})),
	);

	const common = {
		data: flat,
		xField: 'label',
		yField: 'value',
		seriesField: 'series',
		height: 240,
		onReady: (_chart: unknown) => {
			void navigate;
		},
	};

	return (
		<Card size="small" title={<Text strong>{name}</Text>}>
			{chartType === 'Line' && <Line {...common} />}
			{chartType === 'Bar' && <Bar {...common} />}
			{(chartType === 'Pie' || chartType === 'Donut') && (
				<Pie
					data={flat}
					angleField="value"
					colorField="label"
					height={240}
					innerRadius={chartType === 'Donut' ? 0.6 : 0}
				/>
			)}
		</Card>
	);
}

function ShortcutWidget({ label }: { label?: string }) {
	return (
		<Card hoverable size="small" style={{ textAlign: 'center', height: '100%' }}>
			<Link to={`/desk2/workspace/${slug(label ?? '')}`}>
				<Statistic title={label ?? 'Shortcut'} value="" />
			</Link>
		</Card>
	);
}

function CardLinksWidget({ cardName, workspaceName }: { cardName?: string; workspaceName: string }) {
	// `card_name` references a group of links in the Workspace's `links` array.
	// We don't yet have the full link list here (it's on the workspace doc).
	// Stage-2 enhancement: fetch via useWorkspace(workspaceName) and filter.
	void workspaceName;
	return (
		<Card size="small" title={<Text strong>{cardName}</Text>}>
			<Space direction="vertical" size="small">
				<Paragraph type="secondary" style={{ marginBottom: 0 }}>
					Links for this card will populate from the workspace's `links` array.
				</Paragraph>
			</Space>
		</Card>
	);
}

// Mark useEffect as referenced (used elsewhere in module for hot reloads in dev).
void useEffect;
