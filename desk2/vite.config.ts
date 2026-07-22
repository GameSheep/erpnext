import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import proxyOptions from './proxyOptions';

// Production build outputs INTO the Frappe module's public/ folder so Frappe
// serves the SPA at /assets/erpnext/desk2/. The `--base` flag passed in the
// `build` npm script must match. Dev mode runs standalone on port 8081 with a
// proxy back to the local Frappe bench.
export default defineConfig({
	plugins: [react()],
	server: {
		port: 8081,
		host: '0.0.0.0',
		proxy: proxyOptions,
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
	build: {
		outDir: '../erpnext/public/desk2',
		emptyOutDir: true,
		target: 'es2020',
		chunkSizeWarningLimit: 2000,
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (!id.includes('node_modules')) return;
					// Only split the large, self-contained libraries. Anything that
					// pulls in React (rc-*, antd internals, swr, frappe-react-sdk)
					// is left for rollup to bundle automatically — forcing it into a
					// separate chunk creates circular-dependency warnings because
					// React ends up imported from both the vendor chunk and the
					// library chunk.
					if (id.includes('antd/') || id.includes('/antd/')) return 'vendor-antd';
					if (id.includes('@ant-design/pro-')) return 'vendor-pro';
					if (id.includes('monaco-editor') || id.includes('@monaco-editor/')) return 'vendor-monaco';
				},
			},
		},
	},
});
