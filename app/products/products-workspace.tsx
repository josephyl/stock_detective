"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowIcon, SearchIcon } from "@/app/components/icons";
import type { ProductInventoryRow } from "./page";

type Filter = "all" | "review" | "clear";
const pageSize = 10;

function formatQuantity(value: number | null) {
  return value == null ? "—" : new Intl.NumberFormat("en-AU").format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

function exportCsv(rows: ProductInventoryRow[]) {
  const headers = ["SKU", "Product", "Latest reported quantity", "Source", "Location", "Observed at", "Unit cost", "Open issues", "Evidence trust"];
  const values = rows.map((row) => [row.sku, row.name, row.quantity ?? "", row.source ?? "", row.location ?? "", row.observedAt ?? "", row.unitCost ?? "", row.issueCount, row.evidenceTrust ?? ""]);
  const csv = [headers, ...values].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "stockdetective-products.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function ProductsWorkspace({ rows, openIssueCount, highPriorityCount, lastImportAt }: {
  rows: ProductInventoryRow[];
  openIssueCount: number;
  highPriorityCount: number;
  lastImportAt: string | null;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeProduct, setActiveProduct] = useState<ProductInventoryRow | null>(null);

  const sources = useMemo(() => [...new Set(rows.map((row) => row.source).filter((value): value is string => Boolean(value)))].sort(), [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    const term = query.trim().toLowerCase();
    const matchesQuery = !term || row.name.toLowerCase().includes(term) || row.sku.toLowerCase().includes(term) || (row.location ?? "").toLowerCase().includes(term);
    const matchesStatus = filter === "all" || (filter === "review" ? row.issueCount > 0 : row.issueCount === 0);
    return matchesQuery && matchesStatus && (source === "all" || row.source === source);
  }), [rows, query, filter, source]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize);
  const checkedOnPage = pageRows.length > 0 && pageRows.every((row) => selected.includes(row.id));
  const selectedRows = rows.filter((row) => selected.includes(row.id));

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function togglePageSelection(checked: boolean) {
    setSelected((current) => checked
      ? Array.from(new Set([...current, ...pageRows.map((row) => row.id)]))
      : current.filter((id) => !pageRows.some((row) => row.id === id)));
  }

  function setStatus(next: Filter) {
    setFilter(next);
    setPage(1);
  }

  return (
    <div className="products-workspace stack">
      <div className="page-header products-heading">
        <div>
          <div className="page-eyebrow">Inventory / Product catalogue</div>
          <h1>Products</h1>
          <p className="subtitle">Explore stock evidence, find discrepancies and review products across connected sources.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="button secondary" onClick={() => exportCsv(filtered)}>Export CSV</button>
          <Link className="button" href="/upload">+ Import products</Link>
        </div>
      </div>

      <section className="products-kpis" aria-label="Inventory summary">
        <div className="card product-kpi"><span>Products catalogued</span><strong>{formatQuantity(rows.length)}</strong><small>Known SKUs across imports</small></div>
        <div className="card product-kpi"><span>Open exceptions</span><strong>{formatQuantity(openIssueCount)}</strong><small>Issues awaiting investigation</small></div>
        <div className="card product-kpi"><span>High priority</span><strong className={highPriorityCount ? "bad" : "good"}>{formatQuantity(highPriorityCount)}</strong><small>Cases to address first</small></div>
        <div className="card product-kpi"><span>Latest source update</span><strong className="product-kpi-date">{lastImportAt ? new Date(lastImportAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—"}</strong><small>{lastImportAt ? formatDate(lastImportAt) : "No imports recorded"}</small></div>
      </section>

      <section className="card products-panel">
        <div className="products-toolbar">
          <label className="product-search"><SearchIcon /><input aria-label="Search products" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search product name, SKU or location" /></label>
          <label className="product-source-filter"><span>Source</span><select aria-label="Filter by latest source" value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }}><option value="all">All sources</option>{sources.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="product-status-tabs" role="group" aria-label="Filter product status">
            <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setStatus("all")}>All <span>{rows.length}</span></button>
            <button type="button" className={filter === "review" ? "active" : ""} onClick={() => setStatus("review")}>Needs review</button>
            <button type="button" className={filter === "clear" ? "active" : ""} onClick={() => setStatus("clear")}>No open issues</button>
          </div>
        </div>

        <div className="table-wrap products-table-wrap">
          <table className="products-table">
            <thead><tr>
              <th className="product-check-col"><input type="checkbox" aria-label="Select page" checked={checkedOnPage} onChange={(event) => togglePageSelection(event.target.checked)} /></th>
              <th>Product</th><th>Latest reported stock</th><th>Source / location</th><th>Evidence trust</th><th>Status</th><th><span className="sr-only">Details</span></th>
            </tr></thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className={selected.includes(row.id) ? "selected" : ""}>
                  <td><input type="checkbox" aria-label={`Select ${row.name}`} checked={selected.includes(row.id)} onChange={() => toggleSelected(row.id)} /></td>
                  <td><button type="button" className="product-name-button" onClick={() => setActiveProduct(row)}><span><strong>{row.name}</strong><small>{row.sku}</small></span></button></td>
                  <td><strong className="quantity-value">{formatQuantity(row.quantity)}</strong><small className="product-cell-note">{row.observedAt ? `Observed ${formatDate(row.observedAt)}` : "No observations"}</small></td>
                  <td><span>{row.source ?? "—"}</span><small className="product-cell-note">{row.location ?? "No location"}</small></td>
                  <td>{row.evidenceTrust == null ? <span className="muted-text">Not assessed</span> : <span className={row.evidenceTrust < 65 ? "trust-score low" : "trust-score"}>{row.evidenceTrust}%</span>}</td>
                  <td><span className={row.issueCount ? `product-status needs-review ${row.severity ?? ""}` : "product-status no-issues"}><i />{row.issueCount ? `${row.issueCount} open ${row.issueCount === 1 ? "issue" : "issues"}` : "No open issues"}</span></td>
                  <td><button type="button" className="product-row-action" aria-label={`View ${row.name}`} onClick={() => setActiveProduct(row)}><ArrowIcon /></button></td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={7}><div className="empty-state"><h3>No matching products</h3><p>Try a different search or status filter.</p><button type="button" className="button secondary" onClick={() => { setQuery(""); setSource("all"); setStatus("all"); }}>Clear filters</button></div></td></tr>}
            </tbody>
          </table>
        </div>

        <div className="products-footer"><span>Showing {filtered.length ? (Math.min(page, pageCount) - 1) * pageSize + 1 : 0}–{Math.min(Math.min(page, pageCount) * pageSize, filtered.length)} of {filtered.length} products</span><div className="page-controls"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {Math.min(page, pageCount)} of {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>
      </section>

      {selectedRows.length > 0 && <div className="product-bulk-bar" role="status"><strong>{selectedRows.length} selected</strong><button type="button" onClick={() => exportCsv(selectedRows)}>Export selected</button><button type="button" onClick={() => setSelected([])}>Clear selection</button></div>}

      {activeProduct && <div className="product-drawer-backdrop" onClick={() => setActiveProduct(null)}><aside className="product-drawer" role="dialog" aria-modal="true" aria-labelledby="product-drawer-title" onClick={(event) => event.stopPropagation()}><div className="product-drawer-header"><div><div className="page-eyebrow">Product evidence</div><h2 id="product-drawer-title">{activeProduct.name}</h2><p>{activeProduct.sku}</p></div><button type="button" aria-label="Close product details" onClick={() => setActiveProduct(null)}>×</button></div><div className="product-drawer-body"><div className="product-detail-pair"><span>Latest reported quantity</span><strong>{formatQuantity(activeProduct.quantity)} units</strong></div><div className="product-detail-pair"><span>Reporting system</span><strong>{activeProduct.source ?? "Not available"}</strong></div><div className="product-detail-pair"><span>Location</span><strong>{activeProduct.location ?? "Not available"}</strong></div><div className="product-detail-pair"><span>Observation date</span><strong>{formatDate(activeProduct.observedAt)}</strong></div><div className="product-detail-pair"><span>Recorded unit cost</span><strong>{activeProduct.unitCost == null ? "Not available" : activeProduct.unitCost.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}</strong></div><div className="product-detail-pair"><span>Open discrepancies</span><strong>{activeProduct.issueCount}</strong></div><div className="notice">Reported source quantities are not automatically verified stock balances. Review conflicting evidence before making changes.</div></div><div className="product-drawer-actions"><Link href="/agent" className="button">Review in Detective Agent</Link><Link href="/update" className="button secondary">Update verified stock</Link></div></aside></div>}
    </div>
  );
}
