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

function AdminRouter() {
  const { session } = useAuth();
  const { stats } = useAdmin();
  const [page, setPage] = useState('dashboard');

  if (!session) return <LoginPage />;

  const pages = {
    dashboard: <DashboardPage setPage={setPage} />,
    reports:   <ReportsPage />,
    products:  <ProductsPage />,
    orders:    <OrdersPage />,
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

  return (
    <AdminLayout page={page} setPage={setPage} stats={stats}>
      {pages[page] || pages.dashboard}
    </AdminLayout>
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
