export type ReconciliationProposal = {
  quantity: number | null;
  method: string;
  title: string;
  reason: string;
  confidence: "high" | "medium" | "low";
};

export function buildReconciliationProposal(details: any): ReconciliationProposal {
  const sources = Array.isArray(details?.sources) ? details.sources : [];

  if (sources.length < 2) {
    return {
      quantity: null,
      method: "Physical count",
      title: "Verify against a second source",
      reason: "There is not enough independent evidence to propose an authoritative quantity.",
      confidence: "low",
    };
  }

  const byQuantity = new Map<number, string[]>();
  for (const source of sources) {
    const quantity = Number(source.quantity);
    if (!Number.isFinite(quantity)) continue;
    byQuantity.set(quantity, [...(byQuantity.get(quantity) ?? []), String(source.source)]);
  }

  const ranked = [...byQuantity.entries()].sort((a, b) => b[1].length - a[1].length);
  const [top, second] = ranked;

  if (top && top[1].length >= 2 && (!second || top[1].length > second[1].length)) {
    return {
      quantity: top[0],
      method: "Cross-source agreement",
      title: `Propose ${top[0]} units`,
      reason: `${top[1].join(" and ")} independently agree on ${top[0]} units. Human confirmation is still required before resolving the exception.`,
      confidence: top[1].length >= 3 ? "high" : "medium",
    };
  }

  const freshest = [...sources].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )[0];

  return {
    quantity: null,
    method: "Physical count",
    title: "Physical verification recommended",
    reason: freshest
      ? `The sources disagree without a clear majority. ${freshest.source} is the freshest record, but StockTrust will not treat it as authoritative without verification.`
      : "The sources disagree without a clear majority, so StockTrust will not invent an authoritative quantity.",
    confidence: "low",
  };
}
