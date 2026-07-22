import { type PropsWithChildren, useEffect, useState } from 'react';
import { Result, Spin } from 'antd';

import { getCurrentUser, isLoggedIn } from '@/lib/frappe';

/**
 * Gates the SPA behind Frappe's server-side session.
 *
 * In production, `index.html` is served by Frappe only for authenticated users
 * (the route is `/desk2/*`, which is not a guest route). We still check the
 * `user_id` cookie defensively: if it's missing or `Guest`, we hard-redirect
 * to `/login?redirect-to=/desk2` so the user lands back here after signing in.
 *
 * In dev mode (Vite standalone), we tolerate an absent cookie because the
 * developer may have a valid session on the bench domain that isn't visible
 * to the Vite origin. The dev boot fetch in main.tsx will still 401 in that
 * case, surfacing the problem clearly.
 */
export function AuthGate({ children }: PropsWithChildren) {
	const [checking, setChecking] = useState(true);
	const [denied, setDenied] = useState(false);

	useEffect(() => {
		const loggedIn = isLoggedIn();
		const user = getCurrentUser();

		if (!loggedIn || !user) {
			if (import.meta.env.DEV) {
				// In dev we still try to render — the boot fetch will tell us if the
				// session is truly missing.
				console.warn(
					'[desk2] no authenticated session detected in dev. ' +
						'If the app fails to load, sign in to your bench first.',
				);
			} else {
				window.location.href = '/login?redirect-to=/desk2';
				return;
			}
		}
		setChecking(false);
		setDenied(!loggedIn && !import.meta.env.DEV);
	}, []);

	if (denied) {
		return (
			<Result
				status="403"
				title="Not signed in"
				subTitle="Redirecting you to the login page…"
			/>
		);
	}

	if (checking) {
		return (
			<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
				<Spin size="large" />
			</div>
		);
	}

	return <>{children}</>;
}
