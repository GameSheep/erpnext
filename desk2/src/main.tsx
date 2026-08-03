import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';

import './index.css';
import App from './App';
import { getBoot } from '@/lib/frappe';
import { MOCK_BOOT } from './mock/boot';
import { lightTheme, darkTheme } from './theme';

/** Pick the antd locale pack matching the user's Frappe language. */
function pickLocale(lang: string | undefined) {
	const l = (lang ?? 'en').toLowerCase();
	if (l.startsWith('zh')) return zhCN;
	if (l.startsWith('en')) return enUS;
	// Fall back to English for any unsupported locale (stage-1 ships zh + en).
	return enUS;
}

/**
 * Decide the initial theme from `frappe.boot.desk_theme` (Light/Dark/Automatic).
 * Returns the full ThemeConfig (with algorithm merged in).
 */
function pickTheme() {
	const deskTheme = getBoot()?.desk_theme;
	const prefersDark =
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-color-scheme: dark)').matches;
	const isDark = deskTheme === 'Dark' || (deskTheme !== 'Light' && prefersDark);
	const base = isDark ? darkTheme : lightTheme;
	return { isDark, config: { ...base, algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm } };
}

async function tryDevBootFromBench(): Promise<boolean> {
	// Try the real bench's dev endpoint. If it succeeds, the SPA is running
	// inside a real Frappe bench — use the real boot and skip mock mode.
	try {
		const res = await fetch('/api/method/erpnext.www.desk2.get_context_for_dev', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { Accept: 'application/json' },
		});
		if (!res.ok) return false;
		const json = await res.json();
		const payload = json?.message as { boot?: string; layout_direction?: 'ltr' | 'rtl' } | undefined;
		if (!payload?.boot) return false;
		if (!window.frappe) window.frappe = {};
		window.frappe.boot = JSON.parse(payload.boot);
		window.frappe._messages = window.frappe.boot?.__messages ?? {};
		if (payload.layout_direction) document.dir = payload.layout_direction;
		console.info('[desk2] using real Frappe bench boot.');
		return true;
	} catch {
		return false;
	}
}

function installDevMock() {
	// Inject the mock boot + cookie so the rest of the app reads sensible data.
	if (!window.frappe) window.frappe = {};
	if (!window.frappe.boot) window.frappe.boot = MOCK_BOOT;
	window.frappe._messages = {};
	// Fake the user_id cookie so AuthGate's isLoggedIn() passes.
	if (!document.cookie.includes('user_id=')) {
		document.cookie = 'user_id=admin@demo.com; path=/';
	}
	// Install the fetch interceptor (lazy import keeps it out of prod bundle).
	void import('./mock/install').then(({ installMockBackend }) => {
		installMockBackend({ verbose: true });
	});
	console.info('[desk2] running in mock mode — sample data only, no real backend.');
}

async function bootstrap() {
	// In dev: prefer the real bench; fall back to mock data when no bench is
	// reachable (so you can iterate on UI without standing up Frappe).
	if (import.meta.env.DEV && !window.frappe?.boot) {
		const ok = await tryDevBootFromBench();
		if (!ok) installDevMock();
	}

	const rootEl = document.getElementById('root');
	if (!rootEl) throw new Error('#root element not found');

	createRoot(rootEl).render(
		<StrictMode>
			<ConfigProvider
				locale={pickLocale(getBoot()?.lang)}
				theme={pickTheme().config}
			>
				<AntdApp>
					<App />
				</AntdApp>
			</ConfigProvider>
		</StrictMode>,
	);
}

void bootstrap();
