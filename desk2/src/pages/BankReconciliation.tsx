/**
 * Bank Reconciliation Tool — antd reimplementation of the classic ERPNext
 * page (originally in erpnext/public/js/bank_reconciliation_tool/).
 *
 * Simplified flow:
 *  1. Pick a Bank Account + date range.
 *  2. See unmatched bank transactions on the left.
 *  3. For each, either match to an existing voucher (Payment Entry / Journal
 *     Entry / Sales/Purchase Invoice) or create a new Payment Entry.
 *  4. Reconciled transactions move to the "done" list.
 *
 * Data sources (real bench):
 *  - Bank transactions: erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_bank_transactions
 *  - Matching vouchers: …get_matching_vouchers
 *  - Reconcile: …reconcile_vouchers
 *
 * In mock mode these return synthesized data so the UI is explorable.
 */

import { Button, Card, Col, DatePicker, Empty, List, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { CheckOutlined, LinkOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import dayjs from 'dayjs';

import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { formatCurrency } from '@/lib/currency';
import { PageContainer } from '@/components/common/PageContainer';

const { Text } = Typography;

interface BankTransaction {
	name: string;
	date: string;
	description: string;
	deposit: number;
	withdrawal: number;
	status: string;
	party?: string;
	party_type?: string;
}

interface MatchingVoucher {
	name: string;
	doctype: string;
	date: string;
	amount: number;
	party?: string;
}

export function BankReconciliation() {
	const [bankAccount, setBankAccount] = useState<string | undefined>();
	const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
		dayjs().subtract(30, 'day'),
		dayjs(),
	]);
	const [selectedTxn, setSelectedTxn] = useState<BankTransaction | null>(null);

	const txnsQ = useFrappeGetCall<{ message: BankTransaction[] }>(
		'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_bank_transactions',
		{
			bank_account: bankAccount,
			from_date: range[0]?.format('YYYY-MM-DD'),
			to_date: range[1]?.format('YYYY-MM-DD'),
		},
		['bank_txns', bankAccount, range[0]?.format('YYYY-MM-DD'), range[1]?.format('YYYY-MM-DD')],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);

	const matchesQ = useFrappeGetCall<{ message: MatchingVoucher[] }>(
		'erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.get_matching_vouchers',
		{ bank_transaction: selectedTxn?.name },
		selectedTxn ? ['matching_vouchers', selectedTxn.name] : null,
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);

	const reconcile = useFrappePostCall('erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.reconcile_vouchers');

	const transactions = txnsQ.data?.message ?? [];
	const matches = matchesQ.data?.message ?? [];

	const totalUnreconciled = useMemo(
		() => transactions.reduce((sum, t) => sum + (t.deposit - t.withdrawal), 0),
		[transactions],
	);

	const onReconcile = async (voucher: MatchingVoucher) => {
		if (!selectedTxn) return;
		await reconcile.call({
			bank_transaction: selectedTxn.name,
			vouchers: JSON.stringify([{ doctype: voucher.doctype, name: voucher.name }]),
		});
		void txnsQ.mutate();
		setSelectedTxn(null);
	};

	return (
		<PageContainer
			title="Bank Reconciliation"
			breadcrumb={[{ title: <Link to="/desk2">Home</Link> }, { title: 'Accounting' }, { title: 'Bank Reconciliation' }]}
			subtitle="Match bank transactions to vouchers"
			padded={false}
		>
			<Space direction="vertical" size="middle" style={{ width: '100%', padding: 16 }}>
				<Card>
					<Row gutter={16}>
						<Col span={8}>
							<Text strong>Bank Account</Text>
							<Select
								style={{ width: '100%', marginTop: 4 }}
								placeholder="Select bank account"
								value={bankAccount}
								onChange={setBankAccount}
								options={[
									{ value: 'HDFC-001', label: 'HDFC Current - 001' },
									{ value: 'ICICI-002', label: 'ICICI Operations - 002' },
								]}
							/>
						</Col>
						<Col span={12}>
							<Text strong>Date Range</Text>
							<br />
							<DatePicker.RangePicker
								style={{ marginTop: 4 }}
								value={range}
								onChange={(r) => r && setRange(r as [dayjs.Dayjs, dayjs.Dayjs])}
							/>
						</Col>
						<Col span={4} style={{ textAlign: 'right' }}>
							<Statistic title="Unreconciled" value={formatCurrency(totalUnreconciled)} />
						</Col>
					</Row>
				</Card>

				<Row gutter={16}>
					{/* Left: bank transactions */}
					<Col xs={24} lg={12}>
						<Card title={`Bank Transactions (${transactions.length})`} size="small">
							{txnsQ.isLoading ? (
								<Text type="secondary">Loading…</Text>
							) : transactions.length === 0 ? (
								<Empty description="No unreconciled transactions" />
							) : (
								<List
									dataSource={transactions}
									renderItem={(t) => (
										<List.Item
											style={{
												cursor: 'pointer',
												background: selectedTxn?.name === t.name ? '#fff7e6' : undefined,
												padding: '8px 12px',
											}}
											onClick={() => setSelectedTxn(t)}
										>
											<List.Item.Meta
												title={<Space><Text strong>{t.description}</Text>{t.status === 'Reconciled' && <Tag color="green">Done</Tag>}</Space>}
												description={
													<Space split={<Text type="secondary">·</Text>}>
														<Text type="secondary">{t.date}</Text>
														<Text>{formatCurrency(t.deposit - t.withdrawal)}</Text>
														{t.party && <Text type="secondary">{t.party}</Text>}
													</Space>
												}
											/>
										</List.Item>
									)}
								/>
							)}
						</Card>
					</Col>

					{/* Right: matching vouchers for the selected transaction */}
					<Col xs={24} lg={12}>
						<Card
							title={
								<Space>
									<LinkOutlined />
									{selectedTxn ? `Match: ${selectedTxn.description}` : 'Select a transaction'}
								</Space>
							}
							size="small"
						>
							{!selectedTxn ? (
								<Empty description="Pick a bank transaction to see matching vouchers" />
							) : matchesQ.isLoading ? (
								<Text type="secondary">Finding matches…</Text>
							) : (
								<Table<MatchingVoucher>
									dataSource={matches}
									rowKey="name"
									size="small"
									pagination={false}
									columns={[
										{ title: 'Type', dataIndex: 'doctype', width: 120, render: (v: string) => <Tag>{v}</Tag> },
										{ title: 'Name', dataIndex: 'name', render: (v: string, r) => <Link to={`/desk2/form/${encodeURIComponent(r.doctype)}/${encodeURIComponent(v)}`}>{v}</Link> },
										{ title: 'Date', dataIndex: 'date', width: 110 },
										{ title: 'Amount', dataIndex: 'amount', align: 'right', render: (v: number) => formatCurrency(v) },
										{
											title: '',
											key: 'action',
											width: 100,
											render: (_: unknown, r: MatchingVoucher) => (
												<Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => onReconcile(r)}>
													Match
												</Button>
											),
										},
									]}
								/>
							)}
						</Card>
					</Col>
				</Row>
			</Space>
		</PageContainer>
	);
}
