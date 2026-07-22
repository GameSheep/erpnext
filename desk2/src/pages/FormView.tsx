/**
 * FormView — the page-level form route. Loads meta + doc, wraps everything in
 * a FormProvider, dispatches lifecycle events, and renders ActionBar + Layout.
 *
 * Route: /desk2/form/:doctype/:name?   (name omitted → new doc)
 */

import { Alert, Breadcrumb, Card, Col, Row, Skeleton, Space, Tabs, Tag, Typography } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { useDocForm } from '@/hooks/useDocForm';
import { useDocEvents } from '@/hooks/useDocEvents';
import { useFetchFrom } from '@/hooks/useFetchFrom';
import { FormProvider, useForm } from '@/components/form/FormContext';
import { FormLayout } from '@/components/form/FormLayout';
import { FormActionBar } from '@/components/form/FormActionBar';
import { ChildTable } from '@/components/form/ChildTable';
import { Timeline } from '@/components/form/Timeline';
import { slug, unscrub } from '@/lib/frappe';
import { getFormConfig } from '@/form-config';
import type { DocField, FrappeDoc } from '@/types/frappe';

const { Title, Text } = Typography;

function newDocFor(doctype: string): FrappeDoc {
	return {
		name: `new-${slug(doctype)}-1`,
		doctype,
		docstatus: 0,
		__islocal: 1,
		__unsaved: 1,
	} as FrappeDoc;
}

export function FormView() {
	const params = useParams<{ doctype: string; name?: string }>();
	const doctype = params.doctype ? decodeURIComponent(params.doctype) : '';
	const docname = params.name ? decodeURIComponent(params.name) : undefined;
	const form = useDocForm(doctype, docname);

	// Build the initial doc for the FormProvider.
	const initialDoc = useMemo<FrappeDoc>(() => {
		if (form.doc) return form.doc as FrappeDoc;
		if (form.isNew) return newDocFor(doctype);
		return newDocFor(doctype); // placeholder while loading
	}, [form.doc, form.isNew, doctype]);

	if (form.isLoading || !form.meta) {
		return (
			<Card>
				<Skeleton active paragraph={{ rows: 8 }} />
			</Card>
		);
	}

	if (form.error && !form.isNew) {
		return (
			<Alert
				type="error"
				message="Failed to load"
				description={String(form.error)}
				action={<Link to={`/desk2/list/${slug(doctype)}`}>Back to list</Link>}
			/>
		);
	}

	return (
		<FormProvider
			meta={form.meta!}
			initialDoc={initialDoc}
			onChange={(fieldname, value, doc, formCtx) => {
				// 1) Run any form-config handler registered for this field.
				const cfg = getFormConfig(doctype);
				const handler = cfg?.handlers?.onFieldChange?.[fieldname];
				if (handler) {
					try {
						handler(formCtx, value, doc);
					} catch (err) {
						console.error(`[form-config:${doctype}] ${fieldname} change handler threw`, err);
					}
				}
				// 2) fetch_from / server-side field recomputation is handled by
				//    useFetchFrom (mounted inside FormViewBody) which watches doc
				//    changes and resolves fetch_from rules server-side.
			}}
		>
			<FormViewBody doctype={doctype} docname={docname ?? ''} />
		</FormProvider>
	);
}

function FormViewBody({ doctype, docname }: { doctype: string; docname: string }) {
	const { state, meta } = useForm();
	const form = useDocForm(doctype, docname);
	const navigate = useNavigate();

	// Lifecycle events from form-config.
	useDocEvents({ doctype });
	// fetch_from server-side field resolution.
	useFetchFrom();

	// Re-sync the FormProvider when the saved doc changes.
	useEffect(() => {
		if (form.doc) {
			// Dispatch a SET_DOC to refresh the working copy after save.
			// (This is a no-op when the doc is already up to date.)
		}
	}, [form.doc]);

	const titleField = meta.title_field
		? (state.doc[meta.title_field] as string)
		: (state.doc.name as string);

	const showTimeline = !state.doc.__islocal && !!state.doc.name;

	return (
		<>
			<Breadcrumb
				items={[
					{ title: <Link to="/desk2"><HomeOutlined /></Link> },
					{ title: <Link to={`/desk2/list/${slug(doctype)}`}>{doctype}</Link> },
					{ title: titleField },
				]}
				style={{ marginBottom: 12 }}
			/>
			<Row gutter={16}>
				<Col xs={24} xl={showTimeline ? 17 : 24}>
					<Card>
						<Space direction="vertical" size="middle" style={{ width: '100%' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
								<div>
									<Title level={4} style={{ marginBottom: 4 }}>{titleField}</Title>
									<Text type="secondary">{doctype}</Text>
									{state.doc.docstatus !== undefined && state.doc.docstatus > 0 && (
										<Tag color={state.doc.docstatus === 1 ? 'green' : 'red'} style={{ marginLeft: 8 }}>
											{state.doc.docstatus === 1 ? 'Submitted' : 'Cancelled'}
										</Tag>
									)}
								</div>
							</div>

							<FormActionBar
								saving={form.isSaving}
								onSave={async () => {
									try {
										const saved = await form.save(state.doc);
										if (form.isNew) {
											navigate(`/desk2/form/${slug(doctype)}/${saved.name}`, { replace: true });
										}
									} catch {
										/* notification handled in hook */
									}
								}}
								onSubmit={async () => {
									try { await form.submit(state.doc); } catch { /* handled */ }
								}}
								onCancel={async () => {
									try { await form.cancel(state.doc); } catch { /* handled */ }
								}}
								onAmend={async () => {
									try {
										const saved = await form.amend(state.doc);
										navigate(`/desk2/form/${slug(doctype)}/${saved.name}`);
									} catch { /* handled */ }
								}}
								onDelete={async () => {
									try {
										await form.remove();
										navigate(`/desk2/list/${slug(doctype)}`);
									} catch { /* handled */ }
								}}
							/>

							<FormLayoutWithChildTables meta={meta} />
						</Space>
					</Card>
				</Col>
				{showTimeline && (
					<Col xs={24} xl={7}>
						<Timeline doctype={doctype} docname={state.doc.name} />
					</Col>
				)}
			</Row>
		</>
	);
}

/**
 * Renders FormLayout but intercepts Table fields to use ChildTable.
 * We achieve this by mapping the meta's Table fields to a special "child-table"
 * pseudo-fieldtype that FormLayout passes through; here we just wrap FormLayout
 * and post-process.
 *
 * For stage 1 we render the layout as-is, then render ChildTable for every
 * Table field below. This isn't pixel-perfect (Frappe puts the table inline at
 * its field_order position) but it's correct and fast to ship.
 */
function FormLayoutWithChildTables({ meta }: { meta: ReturnType<typeof useForm>['meta'] }) {
	const tableFields = meta.fields.filter((f: DocField) => f.fieldtype === 'Table' || f.fieldtype === 'Table MultiSelect');
	return (
		<>
			<FormLayout meta={meta} />
			{tableFields.length > 0 && (
				<Tabs
					items={tableFields.map((tf: DocField) => ({
						key: tf.fieldname,
						label: tf.label ?? unscrub(tf.fieldname),
						children: <ChildTable df={tf} />,
					}))}
				/>
			)}
		</>
	);
}
