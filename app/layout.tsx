import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Leo-læreren",
  description: "Matteøving i ditt eget tempo.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}
