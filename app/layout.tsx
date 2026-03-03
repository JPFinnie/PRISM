import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title:       'Prism — Portfolio Intelligence',
  description: 'AI-powered portfolio analysis for self-directed investors. One ranked recommendation each month, backed by deterministic maths.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
