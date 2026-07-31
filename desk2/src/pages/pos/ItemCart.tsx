/**
 * ItemCart — the right-hand side of POS.
 *
 * Ported from pos_item_cart.js. Features:
 *  - Lines: item_code / item_name / qty / rate / discount / amount
 *  - Inline qty + rate + discount edit
 *  - Remove line
 *  - Customer picker (Link field)
 *  - Header controls: customer, additional discount, clear cart
 *  - Footer: subtotal / discount / taxes / grand total + Checkout button
 */

import { Button, InputNumber, List, Popconfirm, Space, Statistic, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useMemo } from 'react';

import { LinkPicker } from '@/components/common/LinkPicker';
import { formatCurrency } from '@/lib/currency';
import { flt } from '@/lib/numbers';
import type { POSInvoiceItem } from './api';

const { Text, Title } = Typography;

export interface CartLine extends POSInvoiceItem {
	/** Local id (unique within cart). */
	cart_id: string;
}

export interface ItemCartProps {
	lines: CartLine[];
	customer?: string;
	onCustomerChange: (customer: string | undefined) => void;
	additionalDiscountPct?: number;
	onAdditionalDiscountPctChange: (v: number | undefined) => void;
	taxRate?: number;
	currency?: string;
	onUpdateLine: (cartId: string, patch: Partial<CartLine>) => void;
	onRemoveLine: (cartId: string) => void;
	onClear: () => void;
	onCheckout: () => void;
}

export function ItemCart({
	lines,
	customer,
	onCustomerChange,
	additionalDiscountPct = 0,
	onAdditionalDiscountPctChange,
	taxRate = 0,
	currency,
	onUpdateLine,
	onRemoveLine,
	onClear,
	onCheckout,
}: ItemCartProps) {
	const totals = useMemo(() => {
		let subtotal = 0;
		let lineDiscount = 0;
		for (const l of lines) {
			const gross = l.qty * l.rate;
			const disc = gross * ((l.discount_percentage ?? 0) / 100) + (l.discount_amount ?? 0);
			subtotal += gross - disc;
			lineDiscount += disc;
		}
		const additionalDisc = subtotal * (additionalDiscountPct / 100);
		const netTotal = subtotal - additionalDisc;
		const tax = netTotal * (taxRate / 100);
		const grand = netTotal + tax;
		return { subtotal, lineDiscount, additionalDisc, netTotal, tax, grand };
	}, [lines, additionalDiscountPct, taxRate]);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
			{/* Header: customer + additional discount */}
			<div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
				<Space direction="vertical" size={6} style={{ width: '100%' }}>
					<div>
						<Text type="secondary" style={{ fontSize: 12 }}>Customer</Text>
						<LinkPicker
							doctype="Customer"
							value={customer}
							onChange={(v) => onCustomerChange(v)}
							placeholder="Walk-in customer"
							size="middle"
						/>
					</div>
					<Space>
						<Text type="secondary" style={{ fontSize: 12 }}>Additional discount %:</Text>
						<InputNumber
							size="small"
							min={0}
							max={100}
							step={1}
							value={additionalDiscountPct}
							onChange={(v) => onAdditionalDiscountPctChange(v ?? 0)}
							style={{ width: 80 }}
						/>
					</Space>
				</Space>
			</div>

			{/* Cart lines */}
			<div style={{ flex: 1, overflowY: 'auto' }}>
				{lines.length === 0 ? (
					<div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
						<Space direction="vertical" align="center">
							<ShoppingCartOutlined style={{ fontSize: 32 }} />
							<Text type="secondary">Click items to add to cart</Text>
						</Space>
					</div>
				) : (
					<List
						dataSource={lines}
						renderItem={(line) => {
							const gross = line.qty * line.rate;
							const disc = gross * ((line.discount_percentage ?? 0) / 100);
							const amount = gross - disc;
							return (
								<div style={{ padding: '8px 12px', borderBottom: '1px solid #f5f5f5' }}>
									<Space style={{ width: '100%', justifyContent: 'space-between' }}>
										<Text strong>{line.item_name}</Text>
										<Popconfirm title="Remove?" onConfirm={() => onRemoveLine(line.cart_id)}>
											<Button type="text" danger size="small" icon={<DeleteOutlined />} />
										</Popconfirm>
									</Space>
									<Space size={12} wrap>
										<CartField label="Qty">
											<InputNumber
												size="small"
												min={0.001}
												step={1}
												value={line.qty}
												onChange={(q) => onUpdateLine(line.cart_id, { qty: q ?? 1 })}
												style={{ width: 70 }}
											/>
										</CartField>
										<CartField label="Rate">
											<InputNumber
												size="small"
												min={0}
												step={0.5}
												value={line.rate}
												onChange={(r) => onUpdateLine(line.cart_id, { rate: r ?? 0 })}
												style={{ width: 90 }}
											/>
										</CartField>
										<CartField label="Disc %">
											<InputNumber
												size="small"
												min={0}
												max={100}
												value={line.discount_percentage ?? 0}
												onChange={(d) => onUpdateLine(line.cart_id, { discount_percentage: d ?? 0 })}
												style={{ width: 60 }}
											/>
										</CartField>
										<Text strong style={{ color: '#e74c3c' }}>
											{formatCurrency(amount, currency)}
										</Text>
									</Space>
								</div>
							);
						}}
					/>
				)}
			</div>

			{/* Footer: totals + checkout */}
			<div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 12px', background: '#fafafa' }}>
				<Space direction="vertical" size={2} style={{ width: '100%' }}>
					<TotalLine label="Subtotal" value={formatCurrency(totals.subtotal, currency)} />
					{totals.lineDiscount > 0 && (
						<TotalLine label="Line discounts" value={`− ${formatCurrency(totals.lineDiscount, currency)}`} type="danger" />
					)}
					{totals.additionalDisc > 0 && (
						<TotalLine label={`Additional (${additionalDiscountPct}%)`} value={`− ${formatCurrency(totals.additionalDisc, currency)}`} type="danger" />
					)}
					{taxRate > 0 && (
						<TotalLine label={`Tax (${taxRate}%)`} value={`+ ${formatCurrency(totals.tax, currency)}`} />
					)}
					<Statistic
						title={<Text strong>Grand Total</Text>}
						value={formatCurrency(totals.grand, currency)}
						valueStyle={{ color: '#e74c3c', fontSize: 20, fontWeight: 700 }}
					/>
				</Space>
				<Space style={{ width: '100%', marginTop: 8 }}>
					{lines.length > 0 && (
						<Tooltip title="Clear cart">
							<Button danger onClick={onClear}>Clear</Button>
						</Tooltip>
					)}
					<Button
						type="primary"
						size="large"
						block
						disabled={lines.length === 0 || !customer}
						onClick={onCheckout}
						style={{ marginLeft: 'auto' }}
					>
						Checkout ({lines.length} items)
					</Button>
				</Space>
				{!customer && lines.length > 0 && (
					<Text type="danger" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
						Pick a customer to check out.
					</Text>
				)}
			</div>
		</div>
	);
}

function CartField({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<Space direction="vertical" size={0}>
			<Text type="secondary" style={{ fontSize: 10 }}>{label}</Text>
			{children}
		</Space>
	);
}

function TotalLine({ label, value, type }: { label: string; value: string; type?: 'danger' }) {
	return (
		<Space style={{ width: '100%', justifyContent: 'space-between' }}>
			<Text type="secondary">{label}</Text>
			<Text type={type} strong>{value}</Text>
		</Space>
	);
}

// Keep references stable for tree-shaking friendliness.
void Title; void Tag; void flt;
