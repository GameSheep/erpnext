/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Router basename in production (`desk2`); empty in dev. */
	readonly VITE_BASE_NAME?: string;
	/** WebSocket port for realtime (frappe-react-sdk). */
	readonly VITE_SOCKET_PORT?: string;
	/** Frappe site name for realtime subscription. */
	readonly VITE_SITE_NAME?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
