
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertIcon,
  BotIcon,
  BriefIcon,
  DashboardIcon,
  ShieldIcon,
  TruckIcon,
  UploadIcon,
} from "./icons";

const groups = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Dashboard", icon: DashboardIcon },
      { href: "/agent", label: "Stock Brain", icon: BotIcon },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/exceptions", label: "Exceptions", icon: AlertIcon },
      { href: "/reorder", label: "Reorder safety", icon: ShieldIcon },
      { href: "/brief", label: "Morning brief", icon: BriefIcon },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/upload", label: "Inventory import", icon: UploadIcon },
      { href: "/fulfilment", label: "Fulfilment import", icon: TruckIcon },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand-row">
        <div className="brand-mark">S</div>
        <div className="brand">
          StockTrust
          <small>Inventory intelligence</small>
        </div>
      </div>

      {groups.map((group) => (
        <div className="nav-section" key={group.label}>
          <div className="nav-label">{group.label}</div>
          <nav className="nav">
            {group.items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  href={item.href}
                  key={item.href}
                  className={active ? "nav-link active" : "nav-link"}
                >
                  <span className="nav-icon"><Icon /></span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="status-dot" />
          <strong>Week 7 PoC</strong>
        </div>
        <span>Human-in-the-loop agent</span>
      </div>
    </aside>
  );
}
