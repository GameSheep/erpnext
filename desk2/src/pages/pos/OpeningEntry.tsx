/**
 * OpeningEntry — "开班" modal: cashier picks POS profile + starting cash.
 *
 * Mirrors pos_controller.js's `make_opening_voucher`. Shown when there's no
 * open POS Opening Entry for the current user.
 */

import { Button, Form, Input, InputNumber, Modal, Select, Typography } from 'antd';
import { useState } from 'react';

const { Text } = Typography;

export interface OpeningEntryProps {
	open: boolean;
	profiles: Array<{ name: string; company: string }>;
	onSubmit: (profile: string, company: string, balance: Array<{ mode_of_payment: string; amount: number }>) => Promise<void>;
	onCancel?: () => void;
}

export function OpeningEntry({ open, profiles, onSubmit, onCancel }: OpeningEntryProps) {
	const [form] = Form.useForm();
	const [submitting, setSubmitting] = useState(false);
	const selectedProfile = Form.useWatch('pos_profile', form);
	const company = profiles.find((p) => p.name === selectedProfile)?.company;

	const handleOk = async () => {
		const values = await form.validateFields();
		setSubmitting(true);
		try {
			const balance: Array<{ mode_of_payment: string; amount: number }> = [];
			const cash = values.cash_amount as number | undefined;
			const card = values.card_amount as number | undefined;
			if (cash) balance.push({ mode_of_payment: 'Cash', amount: cash });
			if (card) balance.push({ mode_of_payment: 'Card', amount: card });
			await onSubmit(values.pos_profile, company ?? '', balance);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Modal
			open={open}
			title="Open POS Shift"
			closable={false}
			maskClosable={false}
			confirmLoading={submitting}
			onOk={handleOk}
			onCancel={onCancel}
			okText="Open Shift"
		>
			<Form form={form} layout="vertical">
				<Form.Item name="pos_profile" label="POS Profile" rules={[{ required: true, message: 'Pick a profile' }]}>
					<Select
						placeholder="Select POS Profile"
						options={profiles.map((p) => ({ value: p.name, label: `${p.name} (${p.company})` }))}
					/>
				</Form.Item>
				{selectedProfile && (
					<Form.Item>
						<Text type="secondary">Company: {company}</Text>
					</Form.Item>
				)}
				<Form.Item name="cash_amount" label="Opening Cash Amount">
					<InputNumber prefix="$" min={0} step={100} style={{ width: '100%' }} />
				</Form.Item>
				<Form.Item name="card_amount" label="Opening Card Amount">
					<InputNumber prefix="$" min={0} step={100} style={{ width: '100%' }} />
				</Form.Item>
			</Form>
		</Modal>
	);
}

// Avoid unused warnings for Input (kept for future expansion).
void Input; void Button;
