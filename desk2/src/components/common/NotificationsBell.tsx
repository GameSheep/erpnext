/**
 * NotificationsBell — navbar bell that shows open-item counts per doctype.
 *
 * Data source: `frappe.desk.doctype.notification_log.notification_log.get_notifications`.
 * The response has `open_count_doctype` keyed by doctype name. We surface the
 * top-N doctypes with non-zero counts as a dropdown list; clicking navigates
 * to a filtered list view.
 *
 * Stage 1: read-only display + navigation. Stage 2: mark-as-read, clear-all.
 */

import { Badge, Button, Dropdown, List, type MenuProps, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { useNotificationCounts } from '@/api/desk';
import { slug } from '@/lib/frappe';

const { Text } = Typography;

export function NotificationsBell() {
	const { data } = useNotificationCounts();
	const navigate = useNavigate();

	const items: MenuProps['items'] = useMemo(() => {
		const counts = data?.open_count_doctype ?? {};
		const entries = Object.entries(counts)
			.filter(([, n]) => typeof n === 'number' && n > 0)
			.sort((a, b) => (b[1] as number) - (a[1] as number))
			.slice(0, 10);
		if (entries.length === 0) {
			return [{ key: '__empty', label: <Text type="secondary">No open items</Text> }];
		}
		return entries.map(([doctype, count]) => ({
			key: doctype,
			label: (
				<List.Item style={{ padding: '4px 0' }}>
					<List.Item.Meta
						title={<Text>{doctype}</Text>}
						description={<Badge count={count as number} />}
					/>
				</List.Item>
			),
			onClick: () => navigate(`/desk2/list/${slug(doctype)}`),
		}));
	}, [data, navigate]);

	const total = useMemo(() => {
		const counts = data?.open_count_doctype ?? {};
		return Object.values(counts).reduce<number>((sum, n) => sum + (typeof n === 'number' ? n : 0), 0);
	}, [data]);

	return (
		<Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
			<Badge count={total} size="small" offset={[-2, 2]}>
				<Button type="text" icon={<BellOutlined />} />
			</Badge>
		</Dropdown>
	);
}
