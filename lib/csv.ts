import Papa from "papaparse";
import type { SourceInventoryRow } from "@/lib/types";

function asText(value: unknown): string {
  return String(value ?? "").trim();
}

function asNumber(value: unknown): number | null {
  const raw = asText(value).replace(/[$,\s]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseInventoryCsv(csv: string): SourceInventoryRow[] {
  const result = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (result.errors.length) {
    throw new Error(`CSV parse error: ${result.errors[0].message}`);
  }

  const rows: SourceInventoryRow[] = [];

  for (const raw of result.data) {
    const sku = asText(raw.sku);
    const name = asText(raw.name);
    const quantity = asNumber(raw.quantity);

    if (!sku || !name || quantity === null) {
      continue;
    }

    const location = asText(raw.location) || "Default";
    const updated =
      asText(raw.updated_at) ||
      asText(raw.last_updated) ||
      new Date().toISOString();

    const date = new Date(updated);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid updated_at for SKU ${sku}: ${updated}`);
    }

    rows.push({
      sku,
      name,
      quantity: Math.trunc(quantity),
      location,
      updated_at: date.toISOString(),
      unit_cost: asNumber(raw.unit_cost),
    });
  }

  if (!rows.length) {
    throw new Error(
      "No valid rows found. Required columns: sku, name, quantity."
    );
  }

  return rows;
}
