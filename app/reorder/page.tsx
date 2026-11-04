"use client";

import { useEffect, useState } from "react";

type Product = { id: string; name: string; sku: string };

export default function ReorderSafetyPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch("/api/products/search?q=" + encodeURIComponent(query), {
          signal: controller.signal,
        });
        const body = await response.json();
        if (response.ok) setProducts(body.products ?? []);
      } catch (error: any) {
        if (error?.name !== "AbortError") setProducts([]);
      } finally {
        setSearching(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function check(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    const response = await fetch("/api/reorder-safety?sku=" + encodeURIComponent(selected.sku));
    const body = await response.json();
    setBusy(false);
    setResult(body);
  }

  function choose(product: Product) {
    setSelected(product);
    setQuery(product.name);
    setProducts([]);
    setResult(null);
  }

  return (
    <div className="stack">
      <section className="page-hero">
        <div className="kicker">Replenishment guardrail</div>
        <h1>Reorder Safety Check</h1>
        <div className="subtitle">
          Search by product name or SKU. StockDetective checks whether the evidence is trustworthy before someone relies on the stock figure.
        </div>
      </section>

      <div className="upload-grid">
        <section className="card elevated">
          <div className="kicker">Find a product</div>
          <h2>What are you considering reordering?</h2>

          <form className="form-grid" onSubmit={check} style={{ marginTop: 18 }}>
            <label>
              Product name or SKU
              <div className="product-search">
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                  }}
                  onFocus={() => {
                    if (!query) setQuery("");
                  }}
                  placeholder="Try “Manuka Honey” or HH-MGO550-500"
                  autoComplete="off"
                />

                {!selected && (query.length > 0 || products.length > 0) && (
                  <div className="product-results">
                    {searching && <div className="product-result muted">Searching products…</div>}
                    {!searching && products.map((product) => (
                      <button
                        type="button"
                        className="product-result"
                        onClick={() => choose(product)}
                        key={product.id}
                      >
                        <span>
                          <strong>{product.name}</strong>
                          <small>{product.sku}</small>
                        </span>
                        <span>Choose →</span>
                      </button>
                    ))}
                    {!searching && query && products.length === 0 && (
                      <div className="product-result muted">No matching products.</div>
                    )}
                  </div>
                )}
              </div>
            </label>

            {selected && (
              <div className="selected-product">
                <div>
                  <span className="fact-label">Selected product</span>
                  <strong>{selected.name}</strong>
                  <span>{selected.sku}</span>
                </div>
                <button type="button" className="button secondary" onClick={() => {
                  setSelected(null);
                  setQuery("");
                  setResult(null);
                }}>
                  Change
                </button>
              </div>
            )}

            <button className="button" disabled={busy || !selected}>
              {busy ? "Checking current evidence..." : "Check reorder safety"}
            </button>
          </form>
        </section>

        <aside className="card demo-guide">
          <div className="kicker">What StockDetective checks</div>
          <h2>Use the product people recognise</h2>
          <p className="subtitle">
            Staff should not need to memorise SKUs. Search by the product name you use day-to-day; StockDetective resolves it to the correct SKU behind the scenes.
          </p>
        </aside>
      </div>

      {result && (
        <section className="card elevated">
          {result.error ? (
            <div className="notice error">{result.error}</div>
          ) : (
            <>
              <div className="header-row" style={{ alignItems: "center" }}>
                <div>
                  <div className="kicker">{result.product?.sku}</div>
                  <h2>{result.product?.name}</h2>
                </div>
                <span className={"status-chip " + (result.safe ? "online" : "")}>
                  {result.safe ? "Safe evidence" : "Action required"}
                </span>
              </div>

              <div className={"safety-result " + (result.safe ? "safe" : "risk")} style={{ marginTop: 16 }}>
                <h2>{result.label}</h2>
                <p>{result.reason}</p>
              </div>

              {!!result.issues?.length && (
                <div style={{ marginTop: 18 }}>
                  <div className="kicker">Blocking evidence</div>
                  <div className="source-list">
                    {result.issues.map((issue: any) => (
                      <div className="source-row" key={issue.id}>
                        <strong>{issue.discrepancy_type.replaceAll("_", " ")}</strong>
                        <span className={"badge " + issue.severity}>{issue.severity}</span>
                        <span>{issue.confidence_score}% evidence trust</span>
                        <span>{issue.summary}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
