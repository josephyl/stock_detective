import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileGroup } from "@/lib/reconciliation";
import type { LatestInventoryRecord } from "@/lib/types";

export async function runReconciliation() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("inventory_records")
    .select(
      "id, canonical_product_id, source_system, quantity, location, source_updated_at, unit_cost, source_name, source_sku, imported_at"
    )
    .order("imported_at", { ascending: false });

  if (error) throw error;

  const records = (data ?? []) as Array<LatestInventoryRecord & { imported_at: string }>;

  // Keep only the latest imported row for each product + location + source.
  const latest = new Map<string, LatestInventoryRecord>();

  for (const record of records) {
    const key = [
      record.canonical_product_id,
      record.location,
      record.source_system,
    ].join("::");

    if (!latest.has(key)) {
      latest.set(key, record);
    }
  }

  const groups = new Map<string, LatestInventoryRecord[]>();

  for (const record of latest.values()) {
    const key = [record.canonical_product_id, record.location].join("::");
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  // Recompute open findings. Resolved history remains in resolutions.
  const { error: deleteError } = await supabase
    .from("discrepancies")
    .delete()
    .eq("status", "open");

  if (deleteError) throw deleteError;

  const findings = [...groups.values()].flatMap(reconcileGroup);

  if (findings.length) {
    const { error: insertError } = await supabase.from("discrepancies").insert(
      findings.map((finding) => ({
        canonical_product_id: finding.productId,
        location: finding.location,
        discrepancy_type: finding.type,
        severity: finding.severity,
        confidence_score: finding.confidenceScore,
        value_at_risk: finding.valueAtRisk,
        summary: finding.summary,
        details: finding.details,
      }))
    );

    if (insertError) throw insertError;
  }

  return { groups: groups.size, findings: findings.length };
}
