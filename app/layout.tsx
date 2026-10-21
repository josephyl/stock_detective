import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "StockTrust",
  description: "Inventory reliability and reconciliation for SMB retailers",
};

function NavItem({ href, icon, children }: { href: string; icon: string; children: React.ReactNode }) {
  return (
    <Link href={href}>
      <span className="nav-icon">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="brand-row">
              <div className="brand-mark">S</div>
              <div className="brand">
                StockTrust
                <small>Inventory intelligence</small>
              </div>
            </div>

            <div className="nav-section">
              <div className="nav-label">Workspace</div>
              <nav className="nav">
                <NavItem href="/" icon="01">Dashboard</NavItem>
                <NavItem href="/agent" icon="AI">Stock Brain</NavItem>
              </nav>
            </div>

            <div className="nav-section">
              <div className="nav-label">Operations</div>
              <nav className="nav">
                <NavItem href="/exceptions" icon="!">Exceptions</NavItem>
                <NavItem href="/reorder" icon="R">Reorder safety</NavItem>
                <NavItem href="/brief" icon="B">Morning brief</NavItem>
              </nav>
            </div>

            <div className="nav-section">
              <div className="nav-label">Data</div>
              <nav className="nav">
                <NavItem href="/upload" icon="↑">Inventory import</NavItem>
                <NavItem href="/fulfilment" icon="↗">Fulfilment import</NavItem>
              </nav>
            </div>

            <div className="sidebar-footer">
              <div className="sidebar-status">
                <span className="status-dot" />
                <strong>Week 7 PoC</strong>
              </div>
              Human-in-the-loop agent
            </div>
          </aside>

          <main className="main">
            <div className="main-inner">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
