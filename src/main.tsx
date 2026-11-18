import React from 'react';
import ReactDOM from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import './styles.css';
import { ConfirmProvider, StoreProvider, ToastProvider } from './store';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import InvoiceEditor from './pages/InvoiceEditor';
import InvoiceView from './pages/InvoiceView';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Settings from './pages/Settings';

// Hash routing keeps deep links working on any static host (GitHub Pages, Netlify, a local file).
const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/invoices', element: <Invoices /> },
      { path: '/invoices/new', element: <InvoiceEditor key="new" /> },
      { path: '/invoices/:id', element: <InvoiceView /> },
      { path: '/invoices/:id/edit', element: <InvoiceEditor /> },
      { path: '/clients', element: <Clients /> },
      { path: '/clients/:id', element: <ClientDetail /> },
      { path: '/settings', element: <Settings /> },
      { path: '*', element: <Dashboard /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <StoreProvider>
          <RouterProvider router={router} />
        </StoreProvider>
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>,
);
