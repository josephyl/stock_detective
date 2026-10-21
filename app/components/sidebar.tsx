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

function StockDetectiveMark() {
  return (
    <svg
      className="brand-logo"
      viewBox="0 0 64 64"
      role="img"
      aria-label="StockDetective logo"
    >
      <defs>
        <linearGradient id="sd-ring" x1="8" y1="8" x2="52" y2="52">
          <stop offset="0" stopColor="#2F7BFF" />
          <stop offset="1" stopColor="#3D42E8" />
        </linearGradient>
        <linearGradient id="sd-box" x1="18" y1="17" x2="39" y2="41">
          <stop offset="0" stopColor="#53B8FF" />
          <stop offset="0.48" stopColor="#205CFF" />
          <stop offset="1" stopColor="#111FBD" />
        </linearGradient>
        <linearGradient id="sd-green" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#19C896" />
          <stop offset="1" stopColor="#51E57D" />
        </linearGradient>
      </defs>

      <circle cx="28" cy="28" r="21" fill="none" stroke="url(#sd-ring)" strokeWidth="6" />
      <path d="M43 43 L57 57" stroke="#2C49E8" strokeWidth="8" strokeLinecap="round" />

      <path d="M16 20 L28 14 L40 20 L28 27 Z" fill="#69C9FF" />
      <path d="M16 20 L28 27 L28 42 L16 35 Z" fill="#1848D8" />
      <path d="M40 20 L28 27 L28 42 L40 35 Z" fill="url(#sd-box)" />
      <path d="M25 16 L31 19 L25 23 L20 20 Z" fill="#0B2F9D" />

      <rect x="15" y="34" width="7" height="12" rx="2" fill="#247CFF" />
      <rect x="23.5" y="30" width="7" height="16" rx="2" fill="#50AEFF" />
      <rect x="32" y="25" width="7" height="21" rx="2" fill="url(#sd-green)" />
    </svg>
  );
}

const groups = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Dashboard", icon: DashboardIcon },
      { href: "/agent", label: "Detective Agent", icon: BotIcon },
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
        <StockDetectiveMark />
        <div className="brand">
          StockDetective
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
