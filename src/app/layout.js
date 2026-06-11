import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/main.scss';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'Amahle Blue — Premium Cleaning, Car-Care & Sanitising Products',
  description: 'Shop Amahle Blue: premium, locally-manufactured cleaning, car-care and sanitising solutions. Made in Gauteng, South Africa. Fast nationwide delivery.',
  icons: {
    icon: '/assets/amahle-blue-logo.jpg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${jakarta.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
