/**
 * NotFoundPage — shown for any unmatched route.
 */

import { Button, Result } from 'antd';
import { useNavigate } from 'react-router';

export function NotFoundPage() {
	const navigate = useNavigate();
	return (
		<Result
			status="404"
			title="404"
			subTitle="Sorry, that page doesn't exist."
			extra={<Button type="primary" onClick={() => navigate('/desk2/home')}>Back to Home</Button>}
		/>
	);
}
