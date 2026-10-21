
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export function DashboardIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg>;
}
export function BotIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M9 4h6M12 2v2M6 8h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Zm2 5h.01M16 13h.01M8 17h8" /></svg>;
}
export function AlertIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M12 3 2.7 20h18.6L12 3Zm0 6v5m0 3h.01" /></svg>;
}
export function ShieldIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M12 3 5 6v5c0 4.6 3 7.7 7 10 4-2.3 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-4" /></svg>;
}
export function BriefIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" /></svg>;
}
export function UploadIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M12 16V4m0 0-4 4m4-4 4 4M4 17v3h16v-3" /></svg>;
}
export function TruckIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>;
}
export function SearchIcon(props: IconProps) {
  return <svg {...base(props)}><path d="m20 20-4.5-4.5M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" /></svg>;
}
export function CheckIcon(props: IconProps) {
  return <svg {...base(props)}><path d="m5 12 4 4 10-10" /></svg>;
}
export function ArrowIcon(props: IconProps) {
  return <svg {...base(props)}><path d="M5 12h14m-5-5 5 5-5 5" /></svg>;
}
