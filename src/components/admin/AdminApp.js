'use client';

import React, { useState } from 'react';
import { AdminProvider, useAuth, useAdmin } from './AdminProvider';
import AdminLayout from './AdminLayout';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import ReportsPage from './ReportsPage';
import ProductsPage from './ProductsPage';
import OrdersPage from './OrdersPage';
import CustomersPage from './CustomersPage';
import CategoriesPage from './CategoriesPage';
import ShippingEditor from './ShippingEditor';
import CouponsPage from './CouponsPage';
import ReviewsPage from './ReviewsPage';
import FaqsPage from './FaqsPage';
import AbandonedPage from './AbandonedPage';
import SettingsPage from './SettingsPage';
import NewsletterPage from './NewsletterPage';
import { ConfirmDialog } from '../ui/index';

function AdminRouter() {
  const { session } = useAuth();
  const { stats } = useAdmin();
  const [page, setPage] = useState('dashboard');
  
  // Dashboard shortcuts filter states
  const [initialFilters, setInitialFilters] = useState(null);

  // Unsaved changes warnings
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [pendingPage, setPendingPage] = useState(null);

  if (!session) return <LoginPage />;

  function handlePageChange(nextPage) {
    if (nextPage === page) return;
    if (unsavedChanges) {
      setPendingPage(nextPage);
    } else {
      setPage(nextPage);
    }
  }

  function handleConfirmDiscard() {
    setUnsavedChanges(false);
    setPage(pendingPage);
    setPendingPage(null);
  }

  function handleCancelDiscard() {
    setPendingPage(null);
  }

  const pages = {
    dashboard: <DashboardPage setPage={handlePageChange} setInitialFilters={setInitialFilters} />,
    reports:   <ReportsPage />,
    products:  <ProductsPage />,
    orders:    <OrdersPage initialFilters={initialFilters} clearInitialFilters={() => setInitialFilters(null)} />,
    customers: <CustomersPage />,
    settings:  <SettingsPage />,
    categories:<CategoriesPage />,
    shipping:  <ShippingEditor />,
    coupons:   <CouponsPage />,
    reviews:   <ReviewsPage />,
    faqs:      <FaqsPage />,
    abandoned: <AbandonedPage />,
    newsletter:<NewsletterPage />,
  };

  const currentPage = pages[page] || pages.dashboard;
  const pageWithProps = React.cloneElement(currentPage, { setUnsavedChanges });

  return (
    <>
      <AdminLayout page={page} setPage={handlePageChange} stats={stats}>
        {pageWithProps}
      </AdminLayout>

      <ConfirmDialog
        open={!!pendingPage}
        onClose={handleCancelDiscard}
        onConfirm={handleConfirmDiscard}
        title="Discard Unsaved Changes"
        message="You have unsaved changes. If you leave this page, your changes will be lost. Are you sure you want to navigate away?"
        confirmLabel="Discard"
        variant="danger"
      />
    </>
  );
}

export function AdminApp() {
  return (
    <AdminProvider>
      <AdminRouter />
    </AdminProvider>
  );
}

export default AdminApp;
