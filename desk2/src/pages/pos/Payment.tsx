/**
 * Payment — the checkout modal.
 *
 * Ported from pos_payment.js. Features:
 *  - Multiple payment modes (Cash / Card / UPI / etc. from POS profile)
 *  - Number pad for quick cash entry
 *  - Real-time change calculation
 *  - Submit → calls backend submit_invoice
 *
 * The original ERPNew Payment also supports split payments, rounding, loyalty
 * points — we cover the common 90% (split + change + submit).
 */

import { Button, InputNumber, Modal, Space, Statistic, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatCurrency } from '@/lib/currency';
import type { PaymentMode } from './api';

const { Text } = Typography;

const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

export interface PaymentProps {
	open: boolean;
	grandTotal: number;
	currency?: string;
	/** Available payment modes (from POS profile). */
	modes: string[];
	onSubmit: (payments: PaymentMode[]) => Promise<void>;
	onCancel: () => void;
	submitting?: boolean;
}

export function Payment({ open, grandTotal, currency, modes, onSubmit, onCancel, submitting }: PaymentProps) {
	// Allocate amount per mode — default everything to the first mode.
	const [amounts, setAmounts] = useState<Record<string, number>>({});
	const [activeMode, setActiveMode] = useState<string>(modes[0] ?? 'Cash');

	useEffect(() => {
		if (open && modes.length > 0) {
			setAmounts({ [modes[0]]: grandTotal });
			setActiveMode(modes[0]);
		}
	}, [open, grandTotal, modes]);

	const totalPaid = useMemo(
		() => Object.values(amounts).reduce((s, a) => s + (a || 0), 0),
		[amounts],
	);
	const change = totalPaid - grandTotal;
	const short = grandTotal - totalPaid;

	const setAmount = (mode: string, v: number) => {
		setAmounts((prev) => ({ ...prev, [mode]: v }));
	};

	const onNumpad = useCallback(
		(key: string) => {
			const cur = amounts[activeMode] ?? 0;
			const str = String(cur);
			if (key === '⌫') {
				setAmount(activeMode, str.length > 1 ? Number(str.slice(0, -1)) : 0);
				return;
			}
			let next: string;
			if (key === '.') {
				if (str.includes('.')) return;
				next = str + '.';
			} else {
				next = str === '0' ? key : str + key;
			}
			setAmount(activeMode, Number(next));
		},
		[activeMode, amounts],
	);

	const handleOk = async () => {
		const payments: PaymentMode[] = Object.entries(amounts)
			.filter(([, amt]) => amt > 0)
			.map(([mode_of_payment, amount]) => ({ mode_of_payment, amount }));
		if (payments.length === 0) return;
		await onSubmit(payments);
	};

	return (
		<Modal
			open={open}
			title="Payment"
			width={640}
			onCancel={onCancel}
			destroyOnClose
			footer={[
				<Button key="cancel" onClick={onCancel}>Cancel</Button>,
				<Button
					key="submit"
					type="primary"
					size="large"
					loading={submitting}
					disabled={short > 0.001}
					onClick={handleOk}
				>
					Complete Sale
				</Button>,
			]}
		>
			<Space direction="vertical" size="middle" style={{ width: '100%' }}>
				{/* Amount due + change */}
				<Space size={40}>
					<Statistic title="Amount Due" value={formatCurrency(grandTotal, currency)} valueStyle={{ color: '#e74c3c' }} />
					<Statistic
						title="Change"
						value={formatCurrency(Math.max(0, change), currency)}
						valueStyle={{ color: change >= 0 ? '#52c41a' : undefined }}
					/>
					{short > 0.001 && (
						<Tag color="red">Short: {formatCurrency(short, currency)}</Tag>
					)}
				</Space>

				{/* Payment mode tabs */}
				<Space wrap>
					{modes.map((m) => (
						<Button
							key={m}
							type={activeMode === m ? 'primary' : 'default'}
							onClick={() => setActiveMode(m)}
						>
							{m} {amounts[m] ? `(${formatCurrency(amounts[m], currency)})` : ''}
						</Button>
					))}
				</Space>

				{/* Active amount input + numpad */}
				<Space align="start" size={24} style={{ width: '100%' }}>
					<Space direction="vertical">
						<Text type="secondary">{activeMode} amount</Text>
						<InputNumber
							size="large"
							prefix={currency}
							value={amounts[activeMode] ?? 0}
							onChange={(v) => setAmount(activeMode, v ?? 0)}
							min={0}
							style={{ width: 200 }}
						/>
						<Space>
							<Button size="small" onClick={() => setAmount(activeMode, grandTotal)}>Exact</Button>
							<Button size="small" onClick={() => setAmount(activeMode, Math.ceil(grandTotal / 50) * 50)}>Round ↑50</Button>
							<Button size="small" onClick={() => setAmount(activeMode, Math.ceil(grandTotal / 100) * 100)}>Round ↑100</Button>
						</Space>
					</Space>

					{/* Numpad */}
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 60px)', gap: 4 }}>
						{NUMPAD_KEYS.map((k) => (
							<Button
								key={k}
								size="large"
								style={{ height: 48, fontSize: 18 }}
								onClick={() => onNumpad(k)}
							>
								{k}
							</Button>
						))}
					</div>
				</Space>

				{/* Total paid */}
				<Statistic title="Total Paid" value={formatCurrency(totalPaid, currency)} />
			</Space>
		</Modal>
	);
}
