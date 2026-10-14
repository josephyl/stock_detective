export type SourceInventoryRow = {
  sku: string;
  name: string;
  quantity: number;
  location: string;
  updated_at: string;
  unit_cost: number | null;
};

export type LatestInventoryRecord = {
  id: string;
  canonical_product_id: string;
  source_system: string;
  quantity: number;
  location: string;
  source_updated_at: string;
  unit_cost: number | null;
  source_name: string;
  source_sku: string;
};

export type ReconciliationResult = {
  productId: string;
  location: string;
  type: "quantity_mismatch" | "stale_record" | "insufficient_sources";
  severity: "low" | "medium" | "high";
  confidenceScore: number;
  valueAtRisk: number | null;
  summary: string;
  details: Record<string, unknown>;
};
