/**
 * list-config barrel — imports all per-doctype list configs so they self-register.
 * Add new files here as you migrate doctypes.
 */

export * from './registry';

import './SalesInvoiceList';
import './CustomerList';
import './ItemList';
import './TodoList';
import './HighFrequencyLists';
