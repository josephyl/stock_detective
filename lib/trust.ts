export function trustBand(score: number) {
  if (score >= 85) return { label: "High", className: "good" } as const;
  if (score >= 65) return { label: "Medium", className: "warn" } as const;
  return { label: "Low", className: "bad" } as const;
}

export function trustReason(details: any) {
  const sources = Array.isArray(details?.sources) ? details.sources : [];
  const stale = Array.isArray(details?.stale_sources) ? details.stale_sources : [];
  const divergence = Number(details?.quantity_range?.divergence ?? 0);

  const reasons: string[] = [];
  if (sources.length < 2) reasons.push("only one current source supports the record");
  if (divergence > 0) reasons.push(`sources differ by ${divergence} unit${divergence === 1 ? "" : "s"}`);
  if (stale.length) reasons.push(`${stale.join(", ")} is stale`);

  return reasons.length ? reasons.join("; ") : "current sources agree and are fresh";
}
