import { createAdminClient } from "@/lib/supabase/admin";
import ProductsWorkspace from "./products-workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type ProductInventoryRow = {
  id: string;
  sku: string;
  name: string;
  createdAt: string;
  quantity: number | null;
  source: string | null;
  location: string | null;
  observedAt: string | null;
  unitCost: number | null;
  issueCount: number;
  severity: "high" | "medium" | "low" | null;
  evidenceTrust: number | null;
};

export default async function ProductsPage() {
  const supabase = createAdminClient();
  const [productsResult, recordsResult, issuesResult, importsResult] = await Promise.all([
    supabase.from("canonical_products").select("id,sku,name,created_at").order("name").limit(500),
    supabase.from("inventory_records").select("canonical_product_id,quantity,location,source_system,unit_cost,source_updated_at,imported_at").order("imported_at", { ascending: false }).limit(2000),
    supabase.from("discrepancies").select("canonical_product_id,severity,confidence_score").eq("status", "open"),
    supabase.from("source_imports").select("imported_at").order("imported_at", { ascending: false }).limit(1),
  ]);

  for (const result of [productsResult, recordsResult, issuesResult, importsResult]) {
    if (result.error) throw result.error;
  }

  // A source observation is evidence, not an automatically verified stock balance.
  const latestRecord = new Map<string, any>();
  for (const record of recordsResult.data ?? []) {
    if (!latestRecord.has(record.canonical_product_id)) {
      latestRecord.set(record.canonical_product_id, record);
    }
  }

  const issues = new Map<string, any[]>();
  for (const issue of issuesResult.data ?? []) {
    const group = issues.get(issue.canonical_product_id) ?? [];
    group.push(issue);
    issues.set(issue.canonical_product_id, group);
  }

  const rows: ProductInventoryRow[] = (productsResult.data ?? []).map((product: any) => {
    const record = latestRecord.get(product.id);
    const openIssues = issues.get(product.id) ?? [];
    const severity = (["high", "medium", "low"] as const).find((level) =>
      openIssues.some((issue) => issue.severity === level)
    ) ?? null;
    const evidenceTrust = openIssues.length
      ? Math.round(openIssues.reduce((sum, issue) => sum + Number(issue.confidence_score ?? 0), 0) / openIssues.length)
      : null;
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      createdAt: product.created_at,
      quantity: record?.quantity ?? null,
      source: record?.source_system ?? null,
      location: record?.location ?? null,
      observedAt: record?.source_updated_at ?? null,
      unitCost: record?.unit_cost == null ? null : Number(record.unit_cost),
      issueCount: openIssues.length,
      severity,
      evidenceTrust,
    };
  });

  const allIssues = issuesResult.data ?? [];
  return (
    <ProductsWorkspace
      rows={rows}
      openIssueCount={allIssues.length}
      highPriorityCount={allIssues.filter((issue) => issue.severity === "high").length}
      lastImportAt={importsResult.data?.[0]?.imported_at ?? null}
    />
  );
}
