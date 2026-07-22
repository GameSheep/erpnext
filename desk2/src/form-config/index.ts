/**
 * form-config barrel — imports all per-doctype config files so they self-register
 * at app boot. As we migrate doctypes, add them to the imports below.
 *
 * Stage 1 ships an empty barrel; the engine works for any doctype even without
 * a config (it just won't have custom buttons / make_methods / link filters).
 */

// Re-export the registry + types for consumers.
export * from './registry';

import './SalesInvoice';
import './Customer';
import './Item';
import './FrameworkDoctypes';
