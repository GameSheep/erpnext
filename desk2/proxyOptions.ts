import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import type { ProxyOptions } from 'vite';

// Mirrors banking/proxyOptions.ts: reads the Frappe common_site_config.json to
// find the webserver port, then proxies all Frappe URL prefixes to the right
// host. Multi-tenancy is supported by deriving the site name from the request
// Host header.
//
// Path is `../../../sites/common_site_config.json` because this file lives at
// desk2/proxyOptions.ts and the bench `sites/` folder sits three levels up.
//
// If the config file is missing (e.g. building outside a bench, or in CI), we
// return an empty proxy map — the dev server still starts, it just won't
// forward /api calls to a backend until you run inside a real bench.

const CONFIG_PATH = new URL('../../../sites/common_site_config.json', import.meta.url);

function loadProxyOptions(): Record<string, ProxyOptions> {
	let webserver_port: string | number | undefined;
	try {
		if (existsSync(CONFIG_PATH)) {
			const common_site_config = JSON.parse(
				readFileSync(CONFIG_PATH, 'utf8'),
			) as { webserver_port?: string | number };
			webserver_port = common_site_config.webserver_port;
		}
	} catch (err) {
		console.warn('[desk2] could not read sites/common_site_config.json:', err);
	}

	if (!webserver_port) {
		console.warn(
			'[desk2] no webserver_port found — dev proxy is disabled. ' +
				'Make sure you are running inside a Frappe bench (`frappe` directory layout).',
		);
		return {};
	}

	return {
		'^/(app|api|assets|files|private|login)': {
			target: `http://127.0.0.1:${webserver_port}`,
			ws: true,
			// `router` is an http-proxy feature (per-request target override)
			// that Vite's ProxyOptions type doesn't surface. We use it to support
			// Frappe's host-based multi-tenancy in dev.
			router: (req: { headers?: { host?: string } }) => {
				const site_name = req.headers?.host?.split(':')[0];
				return `http://${site_name ?? 'localhost'}:${webserver_port}`;
			},
		} as ProxyOptions,
	};
}

export default loadProxyOptions();

