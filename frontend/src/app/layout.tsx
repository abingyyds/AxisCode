import './globals.css';

export const metadata = { title: 'AxiSCode', description: 'AI-driven code collaboration' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
