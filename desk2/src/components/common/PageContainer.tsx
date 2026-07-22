/**
 * PageContainer — unified page chrome for all routes.
 *
 * Wraps the common pattern every page repeats:
 *   <Breadcrumb /> + <PageHeader title extra /> + <Skeleton|Error|Content>
 *
 * Using this gives every page a consistent look and removes ~15 lines of
 * boilerplate per page. Pages pass their content as children; loading and
 * error states are handled here so individual pages stay focused.
 */

import { Breadcrumb, Card, Skeleton, Space, Typography } from 'antd';
import type { BreadcrumbProps } from 'antd';
import type { ReactNode } from 'react';

const { Title } = Typography;

export interface PageContainerProps {
	/** Breadcrumb items (the `items` prop of antd Breadcrumb). */
	breadcrumb?: BreadcrumbProps['items'];
	/** Page title (rendered as a Title level={3}). */
	title?: ReactNode;
	/** Extra actions rendered to the right of the title (buttons, tags). */
	extra?: ReactNode;
	/** Short description under the title. */
	subtitle?: ReactNode;
	/** Show a loading skeleton instead of children. */
	loading?: boolean;
	/** Show an error state instead of children. */
	error?: unknown;
	/** Children (the page body). */
	children?: ReactNode;
	/** Padding inside the card. Default 16. */
	padded?: boolean;
}

export function PageContainer({
	breadcrumb,
	title,
	extra,
	subtitle,
	loading,
	error,
	children,
	padded = true,
}: PageContainerProps) {
	return (
		<Space direction="vertical" size="middle" style={{ width: '100%' }}>
			{breadcrumb && <Breadcrumb items={breadcrumb} />}
			{(title || extra) && (
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
					<div>
						{title && <Title level={3} style={{ margin: 0 }}>{title}</Title>}
						{subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
					</div>
					{extra && <Space wrap>{extra}</Space>}
				</div>
			)}
			<Card bodyStyle={{ padding: padded ? 16 : 0 }}>
				{loading ? (
					<Skeleton active paragraph={{ rows: 6 }} />
				) : error ? (
					<Typography.Text type="danger">
						Failed to load: {String(error)}
					</Typography.Text>
				) : (
					children
				)}
			</Card>
		</Space>
	);
}
