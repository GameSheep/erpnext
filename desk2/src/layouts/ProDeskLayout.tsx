/**
 * ProDeskLayout — the application shell.
 *
 * - Sidebar: built from the Workspace list, grouped by module, with a
 *   loading skeleton while fetching and a graceful fallback when empty.
 * - Top bar: global search (Cmd/Ctrl+K), notifications bell, theme toggle,
 *   user avatar menu (Profile / My ToDos / Settings / Sign out).
 * - Content: <Outlet /> wrapped in Suspense + PageErrorBoundary (via
 *   outletWrapper prop from App.tsx).
 */

import { ProLayout, type MenuDataItem } from '@ant-design/pro-components';
import { Avatar, Button, Divider, Dropdown, Skeleton, Space, Switch, Tag, Tooltip, Typography, type MenuProps } from 'antd';
import {
	BellOutlined,
	LogoutOutlined,
	MoonOutlined,
	SearchOutlined,
	SettingOutlined,
	SunOutlined,
	UserOutlined,
} from '@ant-design/icons';
import { useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';

import { useWorkspaceList, type WorkspaceListItem } from '@/api/desk';
import { CommandPalette, useCommandPaletteToggle } from '@/components/common/CommandPalette';
import { NotificationsBell } from '@/components/common/NotificationsBell';
import { getBoot, slug } from '@/lib/frappe';

const { Text } = Typography;

export interface ProDeskLayoutProps {
	/** Wrap the <Outlet /> (used to inject a Suspense boundary for lazy routes). */
	outletWrapper?: (children: React.ReactNode) => React.ReactNode;
}

export function ProDeskLayout({ outletWrapper }: ProDeskLayoutProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const palette = useCommandPaletteToggle();
	const boot = getBoot();
	const userName = boot?.user?.full_name ?? boot?.user?.name ?? 'User';
	const isDark = boot?.desk_theme === 'Dark';

	const wsListQ = useWorkspaceList();
	const workspaces = wsListQ.data?.message ?? [];

	const route = useMemo<{ path: string; children: MenuDataItem[] }>(() => {
		const children: MenuDataItem[] = [];
		children.push({ path: '/desk2/home', name: 'Home', icon: <span style={{ marginRight: 6 }}>🏠</span> });

		const byModule = new Map<string, WorkspaceListItem[]>();
		for (const ws of workspaces) {
			const mod = ws.module ?? 'Other';
			(byModule.get(mod) ?? byModule.set(mod, []).get(mod)!).push(ws);
		}
		for (const [mod, items] of byModule) {
			if (items.length === 1) {
				const ws = items[0];
				children.push({
					path: `/desk2/workspace/${encodeURIComponent(ws.name)}`,
					name: ws.label ?? ws.name,
					icon: <ModuleIcon name={ws.icon} />,
				});
			} else {
				children.push({
					path: `/desk2/module/${encodeURIComponent(slug(mod))}`,
					name: mod,
					icon: <ModuleIcon name="folder" />,
					children: items
						.sort((a, b) => (a.sequence_id ?? 0) - (b.sequence_id ?? 0))
						.map((ws) => ({
							path: `/desk2/workspace/${encodeURIComponent(ws.name)}`,
							name: ws.label ?? ws.name,
						})),
				});
			}
		}

		// Quick-links to bespoke pages.
		children.push({ path: '/desk2/pos', name: 'POS', icon: <span style={{ marginRight: 6 }}>🛒</span> });
		children.push({ path: '/desk2/bank-reconciliation', name: 'Bank Rec', icon: <span style={{ marginRight: 6 }}>🏦</span> });
		children.push({ path: '/desk2/item-dashboard', name: 'Item Dashboard', icon: <span style={{ marginRight: 6 }}>📦</span> });
		children.push({ path: '/desk2/stock-balance', name: 'Stock Balance', icon: <span style={{ marginRight: 6 }}>⚖️</span> });
		children.push({ path: '/desk2/warehouse-capacity', name: 'Warehouse Capacity', icon: <span style={{ marginRight: 6 }}>📐</span> });
		children.push({ path: '/desk2/sales-funnel', name: 'Sales Funnel', icon: <span style={{ marginRight: 6 }}>🔻</span> });
		children.push({ path: '/desk2/bom-comparison', name: 'BOM Compare', icon: <span style={{ marginRight: 6 }}>🔧</span> });
		children.push({ path: '/desk2/shop-floor', name: 'Shop Floor', icon: <span style={{ marginRight: 6 }}>🏭</span> });
		children.push({ path: '/desk2/visual-plant-floor', name: 'Plant Floor', icon: <span style={{ marginRight: 6 }}>🗺️</span> });

		return { path: '/desk2', children };
	}, [workspaces]);

	const userMenu: MenuProps['items'] = [
		{
			key: 'header',
			disabled: true,
			label: (
				<Space direction="vertical" size={0} style={{ padding: '4px 0' }}>
					<Text strong>{userName}</Text>
					<Text type="secondary" style={{ fontSize: 12 }}>{boot?.user?.email}</Text>
				</Space>
			),
		},
		{ type: 'divider' },
		{
			key: 'profile',
			icon: <UserOutlined />,
			label: <Link to={`/desk2/form/User/${encodeURIComponent(boot?.user?.name ?? '')}`}>My Profile</Link>,
		},
		{
			key: 'todos',
			label: <Link to="/desk2/list/ToDo">My ToDos</Link>,
		},
		{
			key: 'settings',
			icon: <SettingOutlined />,
			label: <Link to="/desk2/list/System%20Settings">Settings</Link>,
		},
		{ type: 'divider' },
		{
			key: 'theme',
			label: (
				<Space>
					{isDark ? <MoonOutlined /> : <SunOutlined />}
					Dark mode
					<Switch
						size="small"
						checked={isDark}
						onChange={(checked) => switchTheme(checked ? 'Dark' : 'Light')}
					/>
				</Space>
			),
		},
		{ type: 'divider' },
		{
			key: 'logout',
			danger: true,
			icon: <LogoutOutlined />,
			label: 'Sign out',
			onClick: async () => {
				await fetch('/api/method/logout', { method: 'POST', credentials: 'same-origin' });
				window.location.href = '/login';
			},
		},
	];

	return (
		<>
			<ProLayout
				title="ERPNext"
				logo={<Logo />}
				layout="mix"
				fixedHeader
				fixSiderbar
				siderWidth={220}
				route={route}
				location={{ pathname: location.pathname }}
				menu={{ loading: wsListQ.isLoading && workspaces.length === 0 }}
				menuItemRender={(item, dom) => (
					<a
						onClick={(e) => {
							e.preventDefault();
							if (item.path) navigate(item.path);
						}}
					>
						{dom}
					</a>
				)}
				menuRender={(_props, defaultDom) => {
					if (wsListQ.isLoading && workspaces.length === 0) {
						return (
							<div style={{ padding: 16 }}>
								<Skeleton active paragraph={{ rows: 8 }} />
							</div>
						);
					}
					return defaultDom;
				}}
				menuFooterRender={(props) =>
					props?.collapsed ? (
						<div style={{ textAlign: 'center', padding: 8 }}>
							<Tooltip title="Open original Desk">
								<a href="/app">↩</a>
							</Tooltip>
						</div>
					) : (
						<div style={{ padding: '8px 16px' }}>
							<Divider style={{ margin: '4px 0' }} />
							<Space direction="vertical" size={0}>
								<a href="/app" style={{ fontSize: 12 }}>Open original Desk ↗</a>
								<Text type="secondary" style={{ fontSize: 11 }}>Desk v2 · stage 2</Text>
							</Space>
						</div>
					)
				}
				actionsRender={() => [
					<Tooltip key="search" title="Search (Ctrl+K)">
						<Button type="text" icon={<SearchOutlined />} onClick={() => palette.setOpen(true)} />
					</Tooltip>,
					<NotificationsBell key="notifications" />,
					<Dropdown key="user" menu={{ items: userMenu }} placement="bottomRight" trigger={['click']}>
						<Space style={{ cursor: 'pointer', padding: '0 8px' }}>
							<Avatar size="small" icon={<UserOutlined />} style={{ background: '#e74c3c' }} />
							<span style={{ fontSize: 13, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</span>
						</Space>
					</Dropdown>,
				]}
			>
				{outletWrapper ? outletWrapper(<Outlet />) : <Outlet />}
			</ProLayout>
			<CommandPalette open={palette.open} onClose={() => palette.setOpen(false)} />
		</>
	);
}

/** Toggle the theme on the server + reload so ConfigProvider picks it up. */
async function switchTheme(theme: 'Light' | 'Dark') {
	try {
		await fetch('/api/method/frappe.core.doctype.user.user.switch_theme', {
			method: 'POST',
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/json',
				'X-Frappe-CSRF-Token': window.frappe?.csrf_token ?? '',
			},
			body: JSON.stringify({ desk_theme: theme }),
		});
	} catch {
		/* mock mode — ignore */
	}
	// Update boot in place + reload so main.tsx re-picks the algorithm.
	if (window.frappe?.boot) {
		(window.frappe.boot as Record<string, unknown>).desk_theme = theme;
	}
	window.location.reload();
}

function Logo() {
	return (
		<span style={{
			display: 'inline-block', width: 28, height: 28, borderRadius: 6,
			background: '#e74c3c', color: '#fff', textAlign: 'center', lineHeight: '28px', fontWeight: 700,
		}}>E</span>
	);
}

function ModuleIcon({ name }: { name?: string }) {
	const map: Record<string, string> = {
		house: '🏠', home: '🏠', store: '🏪', 'shopping-cart': '🛒', shopping_cart: '🛒',
		package: '📦', building: '🏢', 'building-2': '🏭', folder: '📁', 'folder-kanban': '🗂️',
		handshake: '🤝', headset: '🎧', archive: '🗃️', landmark: '🏛️', wallet: '👛',
		receipt: '🧾', 'receipt-text': '🧾', sheet: '📊', shield: '🛡️', 'shield-check': '✅',
		sliders: '⚙️', 'sliders-horizontal': '⚙️', cog: '⚙️',
	};
	const icon = (name && map[name]) || '📂';
	return <span style={{ marginRight: 6 }}>{icon}</span>;
}

// Keep referenced for tree-shaking.
void BellOutlined; void Tag;
