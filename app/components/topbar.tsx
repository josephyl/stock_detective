"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const labels: Array<[string, string]> = [
  ["/products", "Products"],
  ["/agent", "Detective Agent"],
  ["/reorder", "Reorder safety"],
  ["/brief", "Teams alerts"],
  ["/update", "Update stock"],
  ["/upload", "Inventory import"],
  ["/fulfilment", "Fulfilment import"],
];

function pageLabel(pathname: string) {
  if (pathname === "/") return "Inventory overview";
  const match = labels.find(([href]) => pathname === href || pathname.startsWith(href + "/"));
  return match?.[1] ?? "Inventory operations";
}

export default function Topbar() {
  const pathname = usePathname();
  const label = pageLabel(pathname);

  return (
    <header className="topbar">
      <div className="topbar-context">
        <span className="topbar-product">StockDetective</span>
        <span className="topbar-separator">/</span>
        <strong>{label}</strong>
      </div>

      <div className="topbar-actions">
        <span className="topbar-health">
          <span className="topbar-health-dot" />
          Evidence-led inventory
        </span>
        <Link href="/products" className="topbar-link">Products</Link>
        <Link href="/update" className="topbar-link">Update stock</Link>
        <Link href="/agent" className="topbar-primary">Open agent</Link>
      </div>
    </header>
  );
}
