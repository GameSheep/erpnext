/**
 * FormActionBar — the button bar at the top of every form.
 *
 * Renders Save / Submit / Cancel / Amend based on docstatus + permissions,
 * plus the secondary menu (Print / Email / Share / Assign / Duplicate / Delete)
 * and any customButtons registered via form-config.
 *
 * Frappe's bar lives at the top of the form (above the layout). We mirror that.
 */

import { App as AntdApp, Button, Dropdown, Popconfirm, Space } from 'antd';
import type { MenuProps } from 'antd';
import {
	CopyOutlined,
	DeleteOutlined,
	LinkOutlined,
	MoreOutlined,
	PrinterOutlined,
	ShareAltOutlined,
} from '@ant-design/icons';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { useForm } from './FormContext';
import { getDoctypePermissions } from '@/lib/permissions';
import { useWorkflowTransitions, useApplyWorkflow } from '@/api/workflow';
import { getBoot } from '@/lib/frappe';
import { slug } from '@/lib/frappe';

export interface FormActionBarProps {
	onSave: () => void;
	onSubmit?: () => void;
	onCancel?: () => void;
	onAmend?: () => void;
	onDelete?: () => void;
	saving?: boolean;
}

export function FormActionBar({ onSave, onSubmit, onCancel, onAmend, onDelete, saving }: FormActionBarProps) {
	const form = useForm();
	const { doc } = form.state;
	const { message } = AntdApp.useApp();
	const navigate = useNavigate();

	const perms = useMemo(
		() => getDoctypePermissions(form.meta, getBoot()?.user),
		[form.meta],
	);
	const boot = getBoot();
	const isAdmin = boot?.user?.name === 'Administrator';
	const docstatus = doc.docstatus ?? 0;
	const isDirty = form.state.dirty;

	// Workflow transitions for the current doc (if a workflow is configured).
	const wfTransitions = useWorkflowTransitions(form.meta.name, doc.__islocal ? undefined : doc.name, docstatus);
	const wfApply = useApplyWorkflow();
	const transitions = wfTransitions.data?.message ?? [];
	const onApplyTransition = async (action: string) => {
		try {
			await wfApply.apply(form.meta.name, doc.name, action);
			message.success(`Workflow: ${action} applied`);
			// Reload to reflect the new state.
			window.location.reload();
		} catch (err) {
			message.error(`Workflow failed: ${String(err)}`);
		}
	};
	const isSubmittable = form.meta.is_submittable === 1;

	// Workflow transitions (if any) get rendered first.
	const moreMenuItems = useMemo(() => {
		const items: MenuProps['items'] = [];
		if (doc.name && !doc.__islocal) {
			items.push({
				key: 'print',
				label: (
					<a onClick={(e) => { e.preventDefault(); navigate(`/desk2/print/${slug(form.meta.name)}/${doc.name}`); }}>
						<PrinterOutlined /> Print
					</a>
				),
			});
			items.push({
				key: 'share',
				label: <><ShareAltOutlined /> Share</>,
				onClick: () => message.info('Share dialog — stage 2'),
			});
			items.push({
				key: 'copy-link',
				label: <><LinkOutlined /> Copy link</>,
				onClick: () => {
					void navigator.clipboard?.writeText(`${window.location.origin}/desk2/form/${slug(form.meta.name)}/${doc.name}`);
					message.success('Link copied');
				},
			});
			if (docstatus === 0) {
				items.push({
					key: 'duplicate',
					label: <><CopyOutlined /> Duplicate</>,
					onClick: () => navigate(`/desk2/form/${slug(form.meta.name)}/new-${slug(form.meta.name)}-1`),
				});
			}
			if ((docstatus === 0 || isAdmin) && perms.delete) {
				items.push({ type: 'divider' });
				items.push({
					key: 'delete',
					danger: true,
					label: <><DeleteOutlined /> Delete</>,
					onClick: () => onDelete?.(),
				});
			}
		}
		return items ?? [];
	}, [doc, form.meta.name, perms.delete, isAdmin, docstatus, navigate, message, onDelete]);

	const canSave = (perms.create && docstatus === 0) || (perms.write && doc.__islocal !== 1);
	const showSave = canSave && docstatus !== 1;
	const showSubmit = isSubmittable && perms.submit && docstatus === 0;
	const showCancel = isSubmittable && perms.cancel && docstatus === 1;
	const showAmend = isSubmittable && perms.amend && docstatus === 2;

	return (
		<Space style={{ marginBottom: 16 }} wrap>
			{showSave && (
				<Button type="primary" loading={saving} onClick={onSave} disabled={!isDirty && !doc.__islocal}>
					{doc.__islocal ? 'Save' : 'Save'}
				</Button>
			)}
			{/* Workflow transitions (rendered before standard Submit when a workflow is active). */}
			{transitions.map((t) => (
				<Popconfirm
					key={t.action}
					title={`Apply "${t.action}"?`}
					okText={t.action}
					onConfirm={() => onApplyTransition(t.action)}
				>
					<Button loading={wfApply.loading} style={t.color ? { borderColor: t.color, color: t.color } : undefined}>
						{t.action}
					</Button>
				</Popconfirm>
			))}
			{showSubmit && (
				<Popconfirm title="Submit this document?" okText="Submit" onConfirm={onSubmit}>
					<Button type="primary" loading={saving}>Submit</Button>
				</Popconfirm>
			)}
			{showCancel && (
				<Popconfirm title="Cancel this document?" okText="Cancel" okButtonProps={{ danger: true }} onConfirm={onCancel}>
					<Button danger loading={saving}>Cancel</Button>
				</Popconfirm>
			)}
			{showAmend && (
				<Button onClick={onAmend} loading={saving}>Amend</Button>
			)}
			{/* Custom buttons from form-config */}
			{form.state.customButtons.map((btn, i) => (
				<Button
					key={`custom-${i}`}
					type={btn.variant ?? 'default'}
					icon={btn.icon}
					onClick={btn.onClick}
				>
					{btn.label}
				</Button>
			))}
			{moreMenuItems.length > 0 && (
				<Dropdown menu={{ items: moreMenuItems }} trigger={['click']}>
					<Button icon={<MoreOutlined />} />
				</Dropdown>
			)}
		</Space>
	);
}
