import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from '@/components/providers';

// Fonts are committed under app/fonts (Google Fonts' latin subsets) rather than
// fetched with next/font/google: that downloads them during `next build`, and a
// bad response from Google on the build server failed the whole deploy.

// Poppins - Headings
const poppins = localFont({
  src: [
    { path: './fonts/poppins-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/poppins-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/poppins-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/poppins-700.woff2', weight: '700', style: 'normal' },
    { path: './fonts/poppins-800.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-poppins',
  display: 'swap',
});
// Inter - Body text (one variable file covers weights 400–700)
const inter = localFont({
  src: './fonts/inter-latin-variable.woff2',
  weight: '400 700',
  style: 'normal',
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tripoday Holidays CRM',
  description: 'Travel Agency Customer Relationship Management System',
  icons: {
    icon: '/tablogo.png',
    apple: '/tablogo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
