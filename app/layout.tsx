import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "StockTrust",
  description: "Inventory reliability and reconciliation for SMB retailers",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="brand">
              StockTrust
              <small>Inventory reliability</small>
            </div>
            <nav className="nav">
              <Link href="/">Dashboard</Link>
              <Link href="/upload">Upload sources</Link>
              <Link href="/exceptions">Exceptions</Link>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
