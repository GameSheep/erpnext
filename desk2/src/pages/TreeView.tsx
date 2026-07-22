/**
 * TreeView — renders a Frappe tree doctype.
 * Uses PageContainer for consistent chrome.
 */

import { Button, Empty, Space, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { Key } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { useDocType } from '@/api/meta';
import { useFrappeGetCall } from 'frappe-react-sdk';
import type { TreeNode } from '@/api/desk';
import { PageContainer } from '@/components/common/PageContainer';
import { slug } from '@/lib/frappe';
import { useNavigate, useParams } from 'react-router';
import { PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface FrappeDataNode extends DataNode {
	name: string;
	isLeaf?: boolean;
	children?: FrappeDataNode[];
}

function toDataNode(n: TreeNode): FrappeDataNode {
	return {
		key: n.name,
		name: n.name,
		title: n.title ?? n.name,
		isLeaf: n.leaf === true || n.is_group === 0,
	};
}

export function TreeView() {
	const params = useParams<{ doctype: string }>();
	const navigate = useNavigate();
	const doctype = params.doctype ? decodeURIComponent(params.doctype) : '';
	const { meta, isLoading } = useDocType(doctype);
	const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
	const [tree, setTree] = useState<FrappeDataNode[]>([]);

	const rootQuery = useFrappeGetCall<{ message: TreeNode[] }>(
		'frappe.desk.treeview.get_children',
		{ doctype, parent: doctype },
		['tree_root', doctype],
		{ revalidateIfStale: false, revalidateOnFocus: false },
	);

	useEffect(() => {
		if (!rootQuery.data?.message) return;
		setTree(rootQuery.data.message.map(toDataNode));
	}, [rootQuery.data]);

	if (isLoading || !meta) {
		return <PageContainer loading breadcrumb={[{ title: doctype }]} />;
	}

	if (!meta.is_tree) {
		return (
			<PageContainer title={`${doctype} Tree`} breadcrumb={[{ title: doctype }, { title: 'Tree' }]}>
				<Empty description={`${doctype} is not a tree doctype`} />
			</PageContainer>
		);
	}

	return (
		<PageContainer
			title={`${doctype} Tree`}
			breadcrumb={[{ title: <Link to="/desk2">Home</Link> }, { title: <Link to={`/desk2/list/${slug(doctype)}`}>{doctype}</Link> }, { title: 'Tree' }]}
			extra={
				<Button
					type="primary"
					icon={<PlusOutlined />}
					onClick={() => navigate(`/desk2/form/${slug(doctype)}/new-${slug(doctype)}-1`)}
				>
					New {doctype}
				</Button>
			}
		>
			{tree.length === 0 ? (
				<Empty description="No nodes yet" />
			) : (
				<Tree<FrappeDataNode>
					treeData={tree}
					showLine
					blockNode
					expandedKeys={expandedKeys}
					onExpand={(keys) => setExpandedKeys(keys)}
					titleRender={(node) => (
						<Space>
							<Link to={`/desk2/form/${slug(doctype)}/${encodeURIComponent(node.name)}`}>
								{node.name}
							</Link>
							<Text type="secondary" style={{ fontSize: 11 }}>{node.isLeaf ? 'leaf' : 'group'}</Text>
						</Space>
					)}
				/>
			)}
		</PageContainer>
	);
}
