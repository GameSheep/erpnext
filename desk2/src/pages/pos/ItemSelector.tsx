/**
 * ItemSelector — the product grid on the left of POS.
 *
 * Ported from pos_item_selector.js. Features:
 *  - Search by item_code / item_name / barcode
 *  - Filter by item group (tabs / chips)
 *  - Infinite-ish paginated grid
 *  - Click an item → onPick(item)
 */

import { Avatar, Col, Empty, Input, Row, Segmented, Spin, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';

import { usePOSItems, type POSItem } from './api';
import { formatCurrency } from '@/lib/currency';

const { Text } = Typography;

export interface ItemSelectorProps {
	onPick: (item: POSItem) => void;
}

export function ItemSelector({ onPick }: ItemSelectorProps) {
	const [search, setSearch] = useState('');
	const [debounced, setDebounced] = useState('');
	const [group, setGroup] = useState<string>('All');
	const [pageStart, setPageStart] = useState(0);

	// Debounce search 300ms.
	useEffect(() => {
		const t = setTimeout(() => {
			setDebounced(search);
			setPageStart(0);
		}, 300);
		return () => clearTimeout(t);
	}, [search]);

	const { data, isLoading } = usePOSItems(pageStart, 40, debounced, group === 'All' ? undefined : group);
	const items = data?.message ?? MOCK_ITEMS;

	const groups = useMemo(() => {
		const set = new Set<string>(items.map((i) => i.item_group).filter(Boolean));
		return ['All', ...Array.from(set)];
	}, [items]);

	// Load more when scrolling near the bottom (simple pagination).
	const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const el = e.currentTarget;
		if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && !isLoading) {
			setPageStart((p) => p + 40);
		}
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
			<Input
				size="large"
				prefix={<SearchOutlined />}
				placeholder="Search by name, code or scan barcode…"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				autoFocus
				style={{ marginBottom: 8 }}
				onKeyDown={(e) => {
					// Enter + a single item matched → pick it (barcode workflow).
					if (e.key === 'Enter' && items.length === 1) onPick(items[0]);
				}}
			/>
			{groups.length > 1 && (
				<Segmented
					size="small"
					value={group}
					onChange={(v) => { setGroup(v as string); setPageStart(0); }}
					options={groups.map((g) => ({ label: g, value: g }))}
					style={{ marginBottom: 8, overflowX: 'auto' }}
				/>
			)}
			<div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }} onScroll={onScroll}>
				{isLoading && items.length === 0 ? (
					<div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
				) : items.length === 0 ? (
					<Empty description="No items match" />
				) : (
					<Row gutter={[6, 6]}>
						{items.map((item) => (
							<Col key={item.name} xs={12} sm={8} md={6} lg={8} xl={6}>
								<ItemCard item={item} onClick={() => onPick(item)} />
							</Col>
						))}
					</Row>
				)}
				{isLoading && items.length > 0 && <div style={{ textAlign: 'center', padding: 12 }}><Spin /></div>}
			</div>
		</div>
	);
}

function ItemCard({ item, onClick }: { item: POSItem; onClick: () => void }) {
	const outOfStock = item.is_stock_item === 1 && (item.actual_qty ?? 0) <= 0;
	return (
		<div
			onClick={onClick}
			style={{
				border: '1px solid #f0f0f0',
				borderRadius: 8,
				padding: 8,
				cursor: 'pointer',
				height: '100%',
				opacity: outOfStock ? 0.55 : 1,
				transition: 'box-shadow .15s',
			}}
			onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
			onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
		>
			{item.image ? (
				<img
					src={item.image}
					alt={item.item_name}
					style={{ width: '100%', height: 56, objectFit: 'cover', borderRadius: 4, marginBottom: 4 }}
				/>
			) : (
				<div style={{ textAlign: 'center', marginBottom: 4 }}>
					<Avatar shape="square" size={48} style={{ background: '#e74c3c' }}>
						{item.item_name.charAt(0)}
					</Avatar>
				</div>
			)}
			<Text strong ellipsis style={{ display: 'block', fontSize: 12, lineHeight: 1.3 }}>
				{item.item_name}
			</Text>
			<Text type="secondary" style={{ fontSize: 11 }}>{item.item_code}</Text>
			<div style={{ marginTop: 2 }}>
				<Text strong style={{ color: '#e74c3c', fontSize: 13 }}>
					{formatCurrency(item.price_list_rate, undefined, 2)}
				</Text>
				{outOfStock && <Tag color="red" style={{ marginLeft: 4, fontSize: 10 }}>Out</Tag>}
			</div>
		</div>
	);
}

// Mock items used when the backend isn't reachable (dev without bench).
const MOCK_ITEMS: POSItem[] = [
	{ name: 'ITEM-001', item_code: 'WIDGET-RED', item_name: 'Red Widget', item_group: 'Finished Goods', price_list_rate: 99.5, rate: 99.5, stock_uom: 'Nos', actual_qty: 50, is_stock_item: 1 },
	{ name: 'ITEM-002', item_code: 'WIDGET-BLUE', item_name: 'Blue Widget', item_group: 'Finished Goods', price_list_rate: 89, rate: 89, stock_uom: 'Nos', actual_qty: 30, is_stock_item: 1 },
	{ name: 'ITEM-003', item_code: 'INSTALL', item_name: 'Installation Service', item_group: 'Services', price_list_rate: 200, rate: 200, stock_uom: 'Hour', is_stock_item: 0 },
	{ name: 'ITEM-005', item_code: 'WIDGET-GREEN', item_name: 'Green Widget', item_group: 'Finished Goods', price_list_rate: 75, rate: 75, stock_uom: 'Nos', actual_qty: 0, is_stock_item: 1 },
	{ name: 'ITEM-006', item_code: 'CABLE', item_name: 'Premium Cable', item_group: 'Accessories', price_list_rate: 15, rate: 15, stock_uom: 'Nos', actual_qty: 200, is_stock_item: 1 },
	{ name: 'ITEM-007', item_code: 'ADAPTER', item_name: 'Adapter Kit', item_group: 'Accessories', price_list_rate: 35, rate: 35, stock_uom: 'Nos', actual_qty: 80, is_stock_item: 1 },
];
