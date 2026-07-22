/**
 * PrintView — embeds Frappe's native `/printview` endpoint in an iframe.
 *
 * This is the pragmatic choice: Frappe's print formats are Jinja templates
 * rendered server-side, so re-implementing the renderer client-side would be
 * a huge effort with no win. We just wrap the existing endpoint.
 *
 * Optional `format` query param picks the print format; default = "Standard".
 */

import { Breadcrumb, Card } from 'antd';
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

const iframeStyle: React.CSSProperties = {
	width: '100%',
	height: '80vh',
	border: '1px solid #d9d9d9',
	borderRadius: 6,
	background: '#fff',
};

export function PrintView() {
	const params = useParams<{ doctype: string; name: string }>();
	const [searchParams] = useSearchParams();
	const doctype = params.doctype ? decodeURIComponent(params.doctype) : '';
	const name = params.name ? decodeURIComponent(params.name) : '';
	const format = searchParams.get('format') ?? 'Standard';

	const src = useMemo(() => {
		const q = new URLSearchParams({ doctype, name, format, no_letterhead: '0' });
		return `/printview?${q.toString()}`;
	}, [doctype, name, format]);

	return (
		<>
			<Breadcrumb
				items={[
					{ title: <Link to="/desk2">Home</Link> },
					{ title: <Link to={`/desk2/list/${doctype}`}>{doctype}</Link> },
					{ title: name },
					{ title: 'Print' },
				]}
				style={{ marginBottom: 12 }}
			/>
			<Card
				title={`Print: ${name} (${format})`}
				extra={<a href={src} target="_blank" rel="noreferrer">Open in new tab</a>}
			>
				<iframe title="print-preview" src={src} style={iframeStyle} />
			</Card>
		</>
	);
}
