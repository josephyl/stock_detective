import type {
  LatestInventoryRecord,
  ReconciliationResult,
} from "@/lib/types";

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function hoursOld(iso: string) {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
}

function severityFor(valueAtRisk: number | null) {
  if (valueAtRisk === null) return "medium" as const;
  const high = envNumber("HIGH_VALUE_RISK_AUD", 500);
  const medium = envNumber("MEDIUM_VALUE_RISK_AUD", 100);
  if (valueAtRisk >= high) return "high" as const;
  if (valueAtRisk >= medium) return "medium" as const;
  return "low" as const;
}

export function reconcileGroup(
  records: LatestInventoryRecord[]
): ReconciliationResult[] {
  if (!records.length) return [];

  const productId = records[0].canonical_product_id;
  const location = records[0].location;
  const staleAfter = envNumber("STALE_AFTER_HOURS", 24);

  const quantities = records.map((r) => r.quantity);
  const maxQ = Math.max(...quantities);
  const minQ = Math.min(...quantities);
  const divergence = maxQ - minQ;

  const costs = records
    .map((r) => r.unit_cost)
    .filter((v): v is number => typeof v === "number");
  const unitCost = costs.length ? Math.max(...costs) : null;
  const valueAtRisk = unitCost === null ? null : divergence * unitCost;

  const stale = records.filter((r) => hoursOld(r.source_updated_at) > staleAfter);

  let confidence = 100;

  if (records.length < 2) confidence -= 25;

  if (divergence > 0) {
    const relative = maxQ === 0 ? 1 : divergence / Math.max(1, maxQ);
    confidence -= Math.min(55, Math.round(15 + relative * 60));
  }

  if (stale.length) {
    confidence -= Math.min(30, stale.length * 15);
  }

  confidence = Math.max(0, Math.min(100, confidence));

  const details = {
    sources: records.map((r) => ({
      source: r.source_system,
      quantity: r.quantity,
      updated_at: r.source_updated_at,
      source_name: r.source_name,
      source_sku: r.source_sku,
      unit_cost: r.unit_cost,
    })),
    quantity_range: { min: minQ, max: maxQ, divergence },
    stale_sources: stale.map((r) => r.source_system),
  };

  const results: ReconciliationResult[] = [];

  if (records.length < 2) {
    results.push({
      productId,
      location,
      type: "insufficient_sources",
      severity: "low",
      confidenceScore: confidence,
      valueAtRisk: null,
      summary: "Only one source currently supports this inventory record.",
      details,
    });
  }

  if (divergence > 0) {
    results.push({
      productId,
      location,
      type: "quantity_mismatch",
      severity: severityFor(valueAtRisk),
      confidenceScore: confidence,
      valueAtRisk,
      summary: `${divergence}-unit difference across current source records.`,
      details,
    });
  }

  if (stale.length) {
    results.push({
      productId,
      location,
      type: "stale_record",
      severity: divergence > 0 ? severityFor(valueAtRisk) : "medium",
      confidenceScore: confidence,
      valueAtRisk,
      summary: `${stale.length} source record${
        stale.length === 1 ? " is" : "s are"
      } older than ${staleAfter} hours.`,
      details,
    });
  }

  return results;
}
