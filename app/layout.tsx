import "./theme.css";
import Sidebar from "./components/sidebar";

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
          <main className="main">
            <div className="main-inner">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
