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
              <Link href="/upload">Upload inventory</Link>
              <Link href="/fulfilment">Upload fulfilment</Link>
              <Link href="/exceptions">Exceptions</Link>
              <Link href="/agent">Stock Brain</Link>
              <Link href="/reorder">Reorder safety</Link>
              <Link href="/brief">Brief</Link>
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
