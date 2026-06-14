'use client';

import React, { useState, useRef, useCallback } from 'react';
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

  // Unsaved changes warnings. Mirror to ref so handlers can read the latest value
  // without needing to be recreated each render — that would break child effects
  // that depend on the handler identity (e.g. OrdersPage's clearInitialFilters effect).
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [pendingPage, setPendingPage] = useState(null);
  const unsavedRef = useRef(false);
  const pendingPageRef = useRef(null);
  unsavedRef.current = unsavedChanges;
  pendingPageRef.current = pendingPage;

  const handlePageChange = useCallback((nextPage) => {
    setPage(prev => {
      if (nextPage === prev) return prev;
      if (unsavedRef.current) {
        setPendingPage(nextPage);
        return prev;
      }
      return nextPage;
    });
  }, []);

  const handleConfirmDiscard = useCallback(() => {
    setUnsavedChanges(false);
    const target = pendingPageRef.current;
    if (target) setPage(target);
    setPendingPage(null);
  }, []);

  const handleCancelDiscard = useCallback(() => {
    setPendingPage(null);
  }, []);

  const clearInitialFilters = useCallback(() => {
    setInitialFilters(null);
  }, []);

  if (!session) return <LoginPage />;

  const pages = {
    dashboard: <DashboardPage setPage={handlePageChange} setInitialFilters={setInitialFilters} />,
    reports:   <ReportsPage />,
    products:  <ProductsPage />,
    orders:    <OrdersPage initialFilters={initialFilters} clearInitialFilters={clearInitialFilters} />,
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
