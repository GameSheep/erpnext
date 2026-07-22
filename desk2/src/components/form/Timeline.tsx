/**
 * Timeline — the activity sidebar on the right of every form.
 *
 * Aggregates four activity streams Frappe tracks for a doc:
 *  - Comments (Communication + Comment doctypes)
 *  - Attachments (File doctype linked to this doc)
 *  - Assignments (To-Do-style, via frappe.desk.form.assign_to)
 *  - Versions (field-change history, via Version doctype)
 *
 * Plus a composer at the top to add a new comment.
 *
 * Data sources:
 *  - Comments: GET /api/resource/Comment?filters={"reference_doctype","reference_name"}
 *    (also Communication for email-style; we union both)
 *  - Attachments: frappe.desk.form.load.get_attachments
 *  - Assignments: frappe.desk.form.assign_to.get
 *  - Versions: GET /api/resource/Version?filters={"ref_doctype","docname"}
 */

import { Avatar, Button, Card, Divider, Empty, Input, Space, Tag, Timeline as AntTimeline, Tooltip, Typography } from 'antd';
import { FileOutlined, MessageOutlined, PaperClipOutlined, UserAddOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { formatDatetime, getTimeago } from '@/lib/date';

const { Text } = Typography;

export interface TimelineProps {
	doctype: string;
	docname: string;
}

interface ActivityItem {
	id: string;
	type: 'comment' | 'attachment' | 'assignment' | 'version';
	author?: string;
	timestamp?: string;
	/** Human-readable summary. */
	summary: React.ReactNode;
	/** Optional detail. */
	detail?: React.ReactNode;
}

interface CommentDoc {
	name: string;
	owner?: string;
	creation?: string;
	content?: string;
	comment_type?: string;
	reference_doctype?: string;
	reference_name?: string;
}

interface AttachmentDoc {
	name: string;
	file_name: string;
	file_url: string;
	owner?: string;
	creation?: string;
	file_size?: number;
	is_private?: 0 | 1;
}

interface AssignmentDoc {
	name: string;
	description?: string;
	owner?: string;
	date?: string;
	allocated_to?: string;
	status?: string;
}

interface VersionDoc {
	name: string;
	owner?: string;
	creation?: string;
	data?: string; // JSON of changed fields
	ref_doctype?: string;
	docname?: string;
}

export function Timeline({ doctype, docname }: TimelineProps) {
	const [tab, setTab] = useState<'all' | 'comments' | 'attachments' | 'assignments' | 'versions'>('all');
	const [newComment, setNewComment] = useState('');
	const [posting, setPosting] = useState(false);

	// Fetch each stream in parallel.
	const commentsQ = useFrappeGetCall<{ message: CommentDoc[] }>(
		'frappe.desk.form.load.get_comments',
		{ reference_doctype: doctype, reference_name: docname },
		['comments', doctype, docname],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);
	const attachmentsQ = useFrappeGetCall<{ message: AttachmentDoc[] }>(
		'frappe.desk.form.load.get_attachments',
		{ doctype, name: docname },
		['attachments', doctype, docname],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);
	const assignmentsQ = useFrappeGetCall<{ message: AssignmentDoc[] }>(
		'frappe.desk.form.assign_to.get',
		{ doctype, name: docname },
		['assignments', doctype, docname],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);
	const versionsQ = useFrappeGetCall<{ message: VersionDoc[] }>(
		'frappe.client.get_list',
		{ doctype: 'Version', fields: ['name', 'owner', 'creation', 'data'], filters: JSON.stringify([['Version', 'ref_doctype', '=', doctype], ['Version', 'docname', '=', docname]]), limit_page_length: 20, order_by: 'creation desc' },
		['versions', doctype, docname],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);
	const addComment = useFrappePostCall('frappe.desk.form.tagger.add_comment');

	const allItems = useMemo<ActivityItem[]>(() => {
		const items: ActivityItem[] = [];
		for (const c of commentsQ.data?.message ?? []) {
			items.push({
				id: `c-${c.name}`,
				type: 'comment',
				author: c.owner,
				timestamp: c.creation,
				summary: <Text strong>{c.owner ?? 'Someone'}</Text>,
				detail: <div dangerouslySetInnerHTML={{ __html: c.content ?? '' }} />,
			});
		}
		for (const a of attachmentsQ.data?.message ?? []) {
			items.push({
				id: `a-${a.name}`,
				type: 'attachment',
				author: a.owner,
				timestamp: a.creation,
				summary: (
					<a href={a.file_url} target="_blank" rel="noreferrer">
						<FileOutlined /> {a.file_name}
					</a>
				),
				detail: a.file_size ? <Text type="secondary">{formatBytes(a.file_size)}</Text> : undefined,
			});
		}
		for (const a of assignmentsQ.data?.message ?? []) {
			items.push({
				id: `as-${a.name}`,
				type: 'assignment',
				author: a.owner,
				timestamp: a.date,
				summary: (
					<Space>
						<UserAddOutlined />
						<Text>Assigned to {a.allocated_to ?? 'someone'}</Text>
					</Space>
				),
				detail: a.description ? <Text type="secondary">{a.description}</Text> : undefined,
			});
		}
		for (const v of versionsQ.data?.message ?? []) {
			const changes = parseVersionData(v.data);
			items.push({
				id: `v-${v.name}`,
				type: 'version',
				author: v.owner,
				timestamp: v.creation,
				summary: <Text>{v.owner ?? 'Someone'} changed {changes.length} field(s)</Text>,
				detail: changes.length > 0 ? (
					<Space wrap size={[4, 4]}>
						{changes.slice(0, 5).map((ch, i) => (
							<Tag key={i} style={{ fontSize: 11 }}>
								{ch.field}: <Text type="secondary">{String(ch.from)}</Text> → <Text>{String(ch.to)}</Text>
							</Tag>
						))}
						{changes.length > 5 && <Tag>+{changes.length - 5}</Tag>}
					</Space>
				) : undefined,
			});
		}
		// Newest first.
		items.sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
		return items;
	}, [commentsQ.data, attachmentsQ.data, assignmentsQ.data, versionsQ.data]);

	const filtered = useMemo(
		() => (tab === 'all' ? allItems : allItems.filter((i) => i.type === tab.slice(0, -1))),
		[allItems, tab],
	);

	const onAddComment = async () => {
		if (!newComment.trim()) return;
		setPosting(true);
		try {
			await addComment.call({
				reference_doctype: doctype,
				reference_name: docname,
				content: newComment,
				comment_email: window.frappe?.boot?.user?.name ?? 'unknown',
				comment_by: window.frappe?.boot?.user?.full_name,
			});
			setNewComment('');
			void commentsQ.mutate();
		} finally {
			setPosting(false);
		}
	};

	const loading = commentsQ.isLoading || attachmentsQ.isLoading;

	return (
		<Card
			size="small"
			title="Activity"
			extra={
				<Space size={4}>
					{(['all', 'comments', 'attachments', 'assignments', 'versions'] as const).map((t) => (
						<Button
							key={t}
							size="small"
							type={tab === t ? 'primary' : 'text'}
							onClick={() => setTab(t)}
							style={{ padding: '0 6px' }}
						>
							{t === 'all' ? 'All' : t[0].toUpperCase()}
						</Button>
					))}
				</Space>
			}
		>
			{/* Comment composer */}
			{tab === 'all' || tab === 'comments' ? (
				<>
					<Input.TextArea
						value={newComment}
						onChange={(e) => setNewComment(e.target.value)}
						placeholder="Write a comment…"
						rows={2}
						style={{ marginBottom: 8 }}
					/>
					<Button
						size="small"
						type="primary"
						loading={posting}
						onClick={onAddComment}
						disabled={!newComment.trim()}
						style={{ marginBottom: 8 }}
					>
						Comment
					</Button>
					<Divider style={{ margin: '8px 0' }} />
				</>
			) : null}

			{loading ? (
				<Text type="secondary">Loading…</Text>
			) : filtered.length === 0 ? (
				<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity yet" />
			) : (
				<AntTimeline
					items={filtered.map((item) => ({
						dot: <ActivityDot type={item.type} />,
						children: (
							<div style={{ paddingBottom: 4 }}>
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									{item.summary}
									{item.timestamp && (
										<Tooltip title={formatDatetime(item.timestamp)}>
											<Text type="secondary" style={{ fontSize: 11 }}>{getTimeago(item.timestamp)}</Text>
										</Tooltip>
									)}
								</div>
								{item.detail && <div style={{ marginTop: 2 }}>{item.detail}</div>}
							</div>
						),
					}))}
				/>
			)}
		</Card>
	);
}

function ActivityDot({ type }: { type: ActivityItem['type'] }) {
	const icon = {
		comment: <MessageOutlined />,
		attachment: <PaperClipOutlined />,
		assignment: <UserAddOutlined />,
		version: <Avatar size="small" style={{ fontSize: 10 }}>V</Avatar>,
	}[type];
	return <span style={{ fontSize: 12 }}>{icon}</span>;
}

function parseVersionData(data: string | undefined): Array<{ field: string; from: unknown; to: unknown }> {
	if (!data) return [];
	try {
		const parsed = JSON.parse(data) as { changed?: Array<[string, unknown, unknown]> };
		return (parsed.changed ?? []).map(([field, from, to]) => ({ field, from, to }));
	} catch {
		return [];
	}
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
