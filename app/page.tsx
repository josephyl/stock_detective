
  const uniqueImports = Array.from(
    new Map((imports ?? []).map((x: any) => [x.source_system, x])).values()
  ).slice(0, 4) as any[];

  const aiEnabled = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Inventory operations</div>
          <h1>Inventory overview</h1>
          <div className="subtitle">
            See what can be trusted, what needs attention, and where Detective Agent is already investigating.
          </div>
        </div>

        <div className="header-actions">
          <span className="status-chip online">● Detective Agent active</span>
          <span className={aiEnabled ? "status-chip ai" : "status-chip"}>
            {aiEnabled ? "AI reasoning connected" : "Deterministic mode"}
          </span>
          <Link href="/update" className="button secondary">
            Update stock
          </Link>
          <Link href="/agent" className="button">
            <BotIcon />
            Open Detective Agent
          </Link>
        </div>
      </div>

      <div className="grid grid-5">
        <div className="card metric-card">
          <div className="metric-label">Needs human review</div>
          <div className="metric">{findings.length}</div>
          <div className="metric-note">Open cases waiting for human judgement</div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">High priority</div>
          <div className={"metric " + (high > 0 ? "bad" : "good")}>{high}</div>
          <div className="metric-note">Immediate review required</div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">Evidence trust</div>
          <div className={"metric " + scoreClass(averageConfidence)}>
            {averageConfidence}%
          </div>
          <div className="metric-note">Source agreement + freshness across open cases</div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">AI confidence</div>
          <div className={"metric " + scoreClass(averageAiConfidence)}>{averageAiConfidence}%</div>
          <div className="metric-note">Confidence in the current recommendations</div>
        </div>

        <div className="card metric-card">
          <div className="metric-label">Last data update</div>
          <div className="metric metric-time">
            {imports?.[0]?.imported_at ? new Date(imports[0].imported_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
          </div>
          <div className="metric-note">
            {imports?.[0]?.imported_at ? new Date(imports[0].imported_at).toLocaleDateString() : "No source data loaded"}
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card elevated">
          <div className="page-header" style={{ alignItems: "center", marginBottom: 14 }}>
            <div>
              <div className="kicker">Human attention queue</div>
              <h2>Priority exceptions</h2>
              <div className="subtitle">Detective Agent has already prioritised the cases that deserve review.</div>
            </div>
            <Link href="/agent" className="button secondary">
              Open in Detective Agent
              <ArrowIcon />
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Product</th>
                  <th>Issue</th>
                  <th>Risk</th>
                  <th>Evidence trust</th>
                </tr>
              </thead>
              <tbody>
                {findings.slice(0, 6).map((row: any) => {
                  const score = priorityScore(row);
                  const band = priorityBand(score);
                  return (
                  <tr key={row.id}>
                    <td>
                      <span className={"badge " + band.className}>{band.label}</span>
                    </td>
                    <td>
                      <Link href={"/exceptions/" + row.id}>
                        <strong>{row.canonical_products?.name ?? "Product"}</strong>
                        <div className="subtitle">{row.canonical_products?.sku}</div>
                      </Link>
                    </td>
                    <td>{row.discrepancy_type.replaceAll("_", " ")}</td>
                    <td>
                      <span className={"badge " + row.severity}>{row.severity}</span>
                    </td>
                    <td>
                      <strong className={scoreClass(row.confidence_score)}>
                        {row.confidence_score}%
                      </strong>
                    </td>
                  </tr>
                  );
                })}
                {!findings.length && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <div className="empty-icon"><CheckIcon /></div>
                        <h2>No open exceptions</h2>
                        <p>Import sample data to begin the Week 7 workflow.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <div className="kicker">Data freshness</div>
            <h2>Source health</h2>
            <div className="source-list" style={{ marginTop: 14 }}>
              {uniqueImports.map((x: any) => (
                <div className="source-row compact" key={x.source_system}>
                  <div>
                    <strong>{x.source_system}</strong>
                    <div className="subtitle">
                      {x.row_count} rows · {new Date(x.imported_at).toLocaleString()}
                    </div>
                  </div>
                  <span className="status-chip online">● Synced</span>
                </div>
              ))}
              {!uniqueImports.length && (
                <div className="empty-state">No source imports yet.</div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="kicker">Bounded autonomy</div>
            <h2>What the agent handles vs escalates</h2>
            <div className="source-list" style={{ marginTop: 14 }}>
              <div className="source-row compact">
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <SearchIcon style={{ color: "var(--primary)" }} />
                  <div>
                    <strong>Human review queue</strong>
                    <div className="subtitle">{findings.length} cases surfaced in deterministic priority order</div>
                  </div>
                </div>
                <span className="status-chip ai">{reorderRisk} reorder risk{reorderRisk === 1 ? "" : "s"}</span>
              </div>
              <div className="source-row compact">
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <CheckIcon style={{ color: "var(--green)" }} />
                  <div>
                    <strong>Low-risk work stays within guardrails</strong>
                    <div className="subtitle">
                      {autoHandled ?? 0} low-risk case{(autoHandled ?? 0) === 1 ? "" : "s"} auto-handled · healthy SKUs are left alone
                    </div>
                  </div>
                </div>
                <span className="status-chip online">Healthy</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
