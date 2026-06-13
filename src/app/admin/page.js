import AdminApp from '../../components/admin/AdminApp';

export const metadata = {
  title: { absolute: 'Admin — Amahle Blue' },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminPage() {
  return <AdminApp />;
}
