/**
 * Design system — centralized theme tokens for antd ConfigProvider.
 *
 * Aims for a modern enterprise-SaaS look (Stripe / Dynamics / Fiori caliber):
 *  - Deep navy sidebar for gravitas (overrides applied in index.css).
 *  - A primary blue that reads as "trustworthy business tool" rather than the
 *    raw #e74c3c red (kept only as a brand accent).
 *  - Tighter type scale, softer shadows, generous spacing.
 *
 * Both light + dark algorithms are configured so the dark-mode toggle feels
 * intentional, not just "inverted colors".
 */

import type { ThemeConfig } from 'antd';

/** Brand palette. Primary action color is a confident indigo-blue. */
export const BRAND = {
	// The trustworthy business primary (replaces the loud red).
	primary: '#2f54eb',
	primaryHover: '#1d39c4',
	primaryActive: '#10239e',
	// ERPNext's signature red — used sparingly as an accent (logo, badges).
	accent: '#e74c3c',
	// Status colors used across Tags / Progress.
	success: '#52c41a',
	warning: '#faad14',
	danger: '#ff4d4f',
	info: '#1890ff',
	// Sidebar deep navy.
	siderBg: '#001529',
	siderBgEnd: '#022b4e',
} as const;

/** Light theme — the default, tuned for an ERP workhorse UI. */
export const lightTheme: ThemeConfig = {
	token: {
		// Color
		colorPrimary: BRAND.primary,
		colorSuccess: BRAND.success,
		colorWarning: BRAND.warning,
		colorError: BRAND.danger,
		colorInfo: BRAND.info,
		colorLink: BRAND.primary,
		colorTextBase: '#1f2937',
		colorBgLayout: '#f5f7fa',
		colorBgContainer: '#ffffff',
		colorBgElevated: '#ffffff',
		colorBorder: '#e5e7eb',
		colorBorderSecondary: '#f0f1f5',
		colorSplit: '#e5e7eb',
		// Typography — a refined system stack with Inter if available.
		fontFamily:
			"'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif",
		fontSize: 14,
		fontSizeHeading1: 28,
		fontSizeHeading2: 24,
		fontSizeHeading3: 20,
		fontSizeHeading4: 17,
		fontSizeHeading5: 15,
		fontSizeSM: 13,
		fontSizeLG: 16,
		fontSizeXL: 18,
		fontSizeIcon: 14,
		lineHeight: 1.5715,
		lineHeightHeading1: 1.3,
		lineHeightHeading2: 1.35,
		lineHeightHeading3: 1.4,
		// Geometry
		borderRadius: 8,
		borderRadiusLG: 12,
		borderRadiusSM: 6,
		borderRadiusXS: 4,
		controlHeight: 34,
		controlHeightLG: 42,
		controlHeightSM: 26,
		controlHeightXS: 20,
		// Spacing
		padding: 16,
		paddingLG: 24,
		paddingMD: 20,
		paddingSM: 12,
		paddingXS: 8,
		paddingXXS: 4,
		margin: 16,
		marginLG: 24,
		marginMD: 20,
		marginSM: 12,
		marginXS: 8,
		marginXXS: 4,
		// Shadows — softer, more layered than antd defaults.
		boxShadow:
			'0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
		boxShadowSecondary:
			'0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
		// Motion
		motionDurationMid: '0.2s',
		motionDurationSlow: '0.3s',
		wireframe: false,
	},
	components: {
		Layout: {
			headerBg: '#ffffff',
			headerHeight: 56,
			headerPadding: '0 24px',
			bodyBg: '#f5f7fa',
			siderBg: BRAND.siderBg,
		},
		Menu: {
			itemBg: 'transparent',
			subMenuItemBg: 'transparent',
			itemColor: 'rgba(255, 255, 255, 0.65)',
			itemHoverColor: '#ffffff',
			itemHoverBg: 'rgba(255, 255, 255, 0.08)',
			itemSelectedColor: '#ffffff',
			itemSelectedBg: 'rgba(47, 84, 235, 0.9)',
			darkItemBg: 'transparent',
			darkSubMenuItemBg: 'transparent',
			itemHeight: 40,
		},
		Card: {
			borderRadiusLG: 12,
			paddingLG: 20,
			boxShadowTertiary:
				'0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)',
		},
		Button: {
			borderRadius: 8,
			controlHeight: 34,
			fontWeight: 500,
			primaryShadow: 'none',
			defaultShadow: 'none',
		},
		Table: {
			headerBg: '#fafbfc',
			headerColor: '#6b7280',
			headerSplitColor: '#e5e7eb',
			rowHoverBg: '#f0f5ff',
			rowSelectedBg: '#e6f0ff',
			rowSelectedHoverBg: '#dbe8ff',
			borderColor: '#f0f1f5',
			cellPaddingBlock: 12,
			cellPaddingInline: 14,
		},
		Statistic: {
			contentFontSize: 26,
		},
		Tag: {
			borderRadiusSM: 4,
		},
		Input: {
			controlHeight: 34,
		},
		Select: {
			controlHeight: 34,
		},
	},
};

/** Dark theme — re-tuned (not just inverted) for long sessions. */
export const darkTheme: ThemeConfig = {
	algorithm: undefined, // set at call site (darkAlgorithm)
	token: {
		colorPrimary: '#4096ff',
		colorSuccess: '#49aa19',
		colorWarning: '#d89614',
		colorError: '#dc4446',
		colorInfo: '#4096ff',
		colorBgLayout: '#0f1419',
		colorBgContainer: '#161b22',
		colorBgElevated: '#1c2330',
		colorBorder: '#30363d',
		colorBorderSecondary: '#21262d',
		colorTextBase: '#e6edf3',
		fontFamily:
			"'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif",
		borderRadius: 8,
		borderRadiusLG: 12,
		boxShadow:
			'0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 6px -1px rgba(0, 0, 0, 0.2)',
		boxShadowSecondary:
			'0 6px 16px 0 rgba(0, 0, 0, 0.35), 0 3px 6px -4px rgba(0, 0, 0, 0.4)',
	},
	components: {
		Layout: {
			headerBg: '#161b22',
			bodyBg: '#0f1419',
			siderBg: '#0a0f16',
		},
		Menu: {
			itemColor: 'rgba(230, 237, 243, 0.65)',
			itemHoverColor: '#ffffff',
			itemHoverBg: 'rgba(255, 255, 255, 0.06)',
			itemSelectedColor: '#ffffff',
			itemSelectedBg: 'rgba(64, 150, 255, 0.85)',
		},
		Table: {
			headerBg: '#161b22',
			headerColor: '#8b949e',
			rowHoverBg: '#1c2330',
			borderColor: '#21262d',
		},
		Card: {
			colorBgContainer: '#161b22',
		},
	},
};
