/**
 * PageErrorBoundary — catches render errors in any page and shows a friendly
 * fallback instead of a blank white screen. Each route is wrapped so a crash
 * in (say) FormView doesn't take down the whole app shell.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result } from 'antd';

interface Props {
	children: ReactNode;
	/** Optional label for the error report (e.g. the route name). */
	label?: string;
}
interface State {
	hasError: boolean;
	error?: Error;
}

export class PageErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error(`[desk2:${this.props.label ?? 'page'}] render error`, error, info.componentStack);
	}

	render() {
		if (!this.state.hasError) return this.props.children;
		return (
			<Result
				status="500"
				title="This page hit an error"
				subTitle={this.state.error?.message ?? 'An unexpected error occurred while rendering this page.'}
				extra={
					<Button type="primary" onClick={() => this.setState({ hasError: false, error: undefined })}>
						Try again
					</Button>
				}
			/>
		);
	}
}
