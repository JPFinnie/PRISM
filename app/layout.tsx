import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title:       'Nexus Edge — Your highest-leverage financial action',
  description: 'AI-powered portfolio analysis for self-directed investors. One ranked recommendation each month, backed by deterministic maths.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
