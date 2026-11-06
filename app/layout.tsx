import "./theme.css";
import "./globals.css";
import Sidebar from "./components/sidebar";
import Topbar from "./components/topbar";

export const metadata = {
  title: "StockDetective",
  description: "AI-assisted inventory investigation and human-in-the-loop reconciliation",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <Sidebar />
          <div className="workspace">
            <Topbar />
            <main className="main">
              <div className="main-inner">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
