import { lazy, Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { FrappeProvider } from 'frappe-react-sdk';
import { App as AntdApp, Spin } from 'antd';

import { AuthGate } from '@/layouts/AuthGate';
import { ProDeskLayout } from '@/layouts/ProDeskLayout';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PageErrorBoundary } from '@/components/common/PageErrorBoundary';
import { getBoot, isLoggedIn } from '@/lib/frappe';

// Lazy-load the heavy route components so the initial bundle stays small.
const FormView = lazy(() => import('@/pages/FormView').then((m) => ({ default: m.FormView })));
const ListView = lazy(() => import('@/pages/ListView').then((m) => ({ default: m.ListView })));
const ReportView = lazy(() => import('@/pages/ReportView').then((m) => ({ default: m.ReportView })));
const WorkspaceView = lazy(() =>
	import('@/pages/WorkspaceView').then((m) => ({ default: m.WorkspaceView })),
);
const TreeView = lazy(() => import('@/pages/TreeView').then((m) => ({ default: m.TreeView })));
const PrintView = lazy(() => import('@/pages/PrintView').then((m) => ({ default: m.PrintView })));
const DataImportExport = lazy(() => import('@/pages/DataImportExport').then((m) => ({ default: m.DataImportExport })));
const BankReconciliation = lazy(() => import('@/pages/BankReconciliation').then((m) => ({ default: m.BankReconciliation })));
const ShopFloor = lazy(() => import('@/pages/ShopFloor').then((m) => ({ default: m.ShopFloor })));
const POS = lazy(() => import('@/pages/POS').then((m) => ({ default: m.POS })));
const ItemDashboard = lazy(() => import('@/pages/ItemDashboard').then((m) => ({ default: m.ItemDashboard })));
const SalesFunnel = lazy(() => import('@/pages/SalesFunnel').then((m) => ({ default: m.SalesFunnel })));
const BOMComparison = lazy(() => import('@/pages/BOMComparison').then((m) => ({ default: m.BOMComparison })));
const StockBalancePage = lazy(() => import('@/pages/StockBalancePage').then((m) => ({ default: m.StockBalancePage })));
const WarehouseCapacity = lazy(() => import('@/pages/WarehouseCapacity').then((m) => ({ default: m.WarehouseCapacity })));
const VisualPlantFloor = lazy(() => import('@/pages/VisualPlantFloor').then((m) => ({ default: m.VisualPlantFloor })));

function PageLoader() {
	return (
		<div style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
			<Spin size="large" />
		</div>
	);
}

/** Wrap a lazy page with Suspense + ErrorBoundary so a single page crash is contained. */
function guarded(node: ReactNode, label: string) {
	return (
		<PageErrorBoundary label={label}>
			<Suspense fallback={<PageLoader />}>{node}</Suspense>
		</PageErrorBoundary>
	);
}

// Self-register form-config + list-config (doctypes added as we migrate them).
import '@/form-config';
import '@/list-config';

function App() {
	// Hard redirect to Frappe login if the cookie is missing (production only).
	useEffect(() => {
		const dev = import.meta.env.DEV;
		if (!dev && !isLoggedIn()) {
			window.location.href = '/login?redirect-to=/desk2';
		}
	}, []);

	const boot = getBoot();
	const basename = import.meta.env.VITE_BASE_NAME ? `/${import.meta.env.VITE_BASE_NAME}` : '';

	return (
		<FrappeProvider
			swrConfig={{ errorRetryCount: 2, revalidateOnFocus: false }}
			socketPort={import.meta.env.VITE_SOCKET_PORT}
			siteName={boot?.sitename ?? import.meta.env.VITE_SITE_NAME}
		>
			<AntdApp>
				<AuthGate>
					{boot?.user?.name && boot.user.name !== 'Guest' ? (
						<BrowserRouter basename={basename}>
							<Routes>
								<Route
									path="/"
									element={
										<ProDeskLayout
											outletWrapper={(children) => (
											<PageErrorBoundary label="layout">
												<Suspense fallback={<PageLoader />}>{children}</Suspense>
											</PageErrorBoundary>
										)}
										/>
									}
								>
									<Route index element={<Navigate to="/home" replace />} />
									<Route path="home" element={<HomePage />} />
									<Route path="workspace" element={<Navigate to="/workspace/Home" replace />} />
									<Route path="workspace/:name" element={guarded(<WorkspaceView />, 'workspace')} />
									<Route path="list/:doctype" element={guarded(<ListView />, 'list')} />
									<Route path="list/:doctype/:view" element={guarded(<ListView />, 'list')} />
									<Route path="form/:doctype" element={guarded(<FormView />, 'form')} />
									<Route path="form/:doctype/:name" element={guarded(<FormView />, 'form')} />
									<Route path="report/:name" element={guarded(<ReportView />, 'report')} />
									<Route path="tree/:doctype" element={guarded(<TreeView />, 'tree')} />
									<Route path="print/:doctype/:name" element={guarded(<PrintView />, 'print')} />
									<Route path="import-export/:doctype" element={guarded(<DataImportExport />, 'import-export')} />
									<Route path="bank-reconciliation" element={guarded(<BankReconciliation />, 'bank-rec')} />
									<Route path="shop-floor" element={guarded(<ShopFloor />, 'shop-floor')} />
									<Route path="pos" element={guarded(<POS />, 'pos')} />
									<Route path="item-dashboard" element={guarded(<ItemDashboard />, 'item-dashboard')} />
									<Route path="sales-funnel" element={guarded(<SalesFunnel />, 'sales-funnel')} />
									<Route path="bom-comparison" element={guarded(<BOMComparison />, 'bom-comparison')} />
									<Route path="stock-balance" element={guarded(<StockBalancePage />, 'stock-balance')} />
									<Route path="warehouse-capacity" element={guarded(<WarehouseCapacity />, 'warehouse-capacity')} />
									<Route path="visual-plant-floor" element={guarded(<VisualPlantFloor />, 'visual-plant-floor')} />
									<Route path="*" element={<NotFoundPage />} />
								</Route>
							</Routes>
						</BrowserRouter>
					) : (
						<PageLoader />
					)}
				</AuthGate>
			</AntdApp>
		</FrappeProvider>
	);
}

export default App;
