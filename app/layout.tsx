import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Leo-læreren',
  description: 'En rolig start på matteeventyret.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nb">
      <body>
        <main className="mx-auto max-w-3xl p-6 md:p-12">{children}</main>
      </body>
    </html>
  );
}
