/**
 * Resource CRUD — thin wrappers over frappe-react-sdk's document hooks with
 * typed responses and consistent SWR key discipline (so we can invalidate by
 * key from anywhere via useSWRConfig().mutate).
 *
 * The SDK already talks to `/api/resource/{doctype}`. We add:
 *  - stable SWR keys of the form `["doc", doctype, name]` / `["doclist", doctype, args-hash]`
 *  - typed responses
 */

import {
	useFrappeCreateDoc,
	useFrappeDeleteDoc,
	useFrappeGetDoc,
	useFrappeGetDocList,
	useFrappeUpdateDoc,
} from 'frappe-react-sdk';
import type { Filter, GetDocListArgs, SWRConfiguration } from 'frappe-react-sdk';

/** Read a single document. */
export function useDoc<T = Record<string, unknown>>(
	doctype: string,
	name: string | undefined,
	options?: SWRConfiguration,
) {
	const swrKey = doctype && name ? ['doc', doctype, name] : null;
	return useFrappeGetDoc<T>(doctype, name, swrKey, {
		revalidateIfStale: false,
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
		...options,
	});
}

/** Read a list of documents (typed). */
export function useDocList<T = Record<string, unknown>>(
	doctype: string,
	args?: GetDocListArgs,
	options?: SWRConfiguration,
) {
	// Stable key by doctype + serialized args so consumers can mutate by key.
	const argsKey = args ? JSON.stringify(args) : 'all';
	const swrKey = ['doclist', doctype, argsKey];
	return useFrappeGetDocList<T>(doctype, args, swrKey, {
		revalidateIfStale: false,
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
		...options,
	});
}

/** Create / update / delete hooks. */
export { useFrappeCreateDoc, useFrappeUpdateDoc, useFrappeDeleteDoc };

export type { Filter, GetDocListArgs };
