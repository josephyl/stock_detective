# StockDetective redesign — design QA

**final result: passed**

## Artifacts and comparison setup

- **Source visual truth:** User-supplied inventory dashboard/product screenshot set in `upload/`, particularly `image(20261106-041518).png` (Biosynthesie product workspace, 2048 × 1536 px), `Screenshot 2026-11-06 at 3.09.14 pm.png` (Marline dashboard, 1818 × 1358 px), `Screenshot 2026-11-06 at 3.09.27 pm.png` (Marline products, 1398 × 1038 px), `Screenshot 2026-11-06 at 3.11.29 pm.png` (DreamsPOS, 1638 × 1096 px), `Screenshot 2026-11-06 at 3.12.13 pm.png` (UnityWare dashboard, 1290 × 1796 px), and `image(20261106-041647).png` (logistics/warehouse concept, 2048 × 1536 px). `image(20261106-041655).png` repeats the Biosynthesie inspiration.
- **Implementation:** `http://terminal.local:4173/demo`, rendered in cloud browser Chrome (`cdp`), using representative StockDetective inventory evidence. The implementation screenshot was captured and emitted in the browser's QA tool output; it is not stored as a separate file on this filesystem. The comparison page was at `http://terminal.local:4173/qa` and placed the Biosynthesie screenshot beside a browser-rendered StockDetective products workspace in the same observation; this comparison route and reference image are local QA fixtures, not part of the GitHub PR.
- **Viewport:** Browser capture approximately 1348 × 926 CSS px at device scale factor 1, with implementation product region occupying the remainder of a 232 px navigation sidebar. Source image dimensions vary as above; the primary source image was displayed proportionally in a 650 px-high reference panel and the implementation was scaled to 0.575 inside a companion panel for direction-level composition comparison. Neither screenshot represents the exact same content, viewport, or product state because the user requested synthesis across multiple screenshots, not pixel-perfect reproduction.
- **States:** Products default view, Needs review filter, search result, row selection/bulk action bar, and product details drawer were visually inspected. QA comparison is directional for layout, density, hierarchy, and interaction conventions.

## Findings

No actionable P0/P1/P2 visual issues found in the inspected desktop states. The redesign is intentionally adapted to StockDetective's evidence and discrepancy data rather than recreating the retail product titles, sales metrics, imagery, and source logos in the inspiration screens.

### Mandatory fidelity surfaces

1. **Typography:** The rendered workspace uses a consistent, legible UI sans-serif scale with prominent Products heading, medium-weight column labels, and restrained secondary copy. Hierarchy follows the screenshots' compact admin-dashboard patterns. Long product names remain readable in the first table column; there is no observed text collision or overflow at the inspected desktop size.
2. **Spacing/layout rhythm:** A slim persistent sidebar, topbar, four KPI tiles, search/status toolbar, and dense tabular inventory list echo the reference page architecture. Card padding, radii, table row height, and restrained borders are internally consistent. This is an inspiration-led adaptation, not a 1:1 copy of any single mockup.
3. **Colors/tokens:** Light neutral background, white elevated cards, subtle gray borders, and a purple primary action are consistent with the Biosynthesie and UnityWare references. Semantic warning/red and success/green states remain independently legible; they communicate inventory discrepancies rather than arbitrary retail catalog statuses.
4. **Image quality/assets:** The follow-up implementation adds six distinct, photorealistic illustrative product images, each framed in a 46 px square thumbnail and a 250 px detail preview. Subjects are recognizable (honey jars, propolis spray, royal jelly capsules, honeycomb, beeswax balm); studio backdrops and sharpness are consistent. All illustrative images are explicitly labelled as unverified packaging in the accessible alt text and details drawer. Real images are loaded from the optional image URL field when available. No unrelated product photography is silently substituted, and unknown SKUs retain a clear No image empty state.
5. **Copy/content:** Labels describe real StockDetective concepts (`Products catalogued`, `Open exceptions`, `High priority`, `Latest source update`, `Evidence trust`). The detail drawer warns that source quantities are not automatically verified balances. No fictional revenue/customer counts were carried over from the references.
6. **Controls/icons:** Sidebar icons, search field, source filter, status pills, row action, checkboxes, CSV export, and product details drawer are visually aligned in the inspected states. Keyboard `Escape` closes the drawer. All central task controls have working handlers in the browser QA flow.

## Tested interactions

- `Needs review` filtered 6 sample products to 3.
- Opening Haddrell's Manuka Honey displayed the evidence drawer and correct product-specific values; close action worked.
- Searching for `propolis` narrowed the table to 1 match.
- Selecting a row displayed the bulk selection toolbar, including Export selected and Clear selection.
- Browser console had extension-only messages, with no observed StockDetective application errors.
- Local `npm run build` passed, and Vercel reported the GitHub feature-branch deployment as `READY` on commit `b4d0d9ac9dc191cedd6b81458895820c6aab05f5`.

## Open questions and integration gaps

- **Live data:** Browser QA used local sample rows. The Supabase-backed `/products` route built successfully and the GitHub preview deployment is `READY`, but a signed-in real-data smoke test was not possible from the protected Vercel preview in this QA session. Validate it before merging.
- **Responsive breakpoints:** Desktop was visually checked; tablet and mobile widths were not visually captured in this session. The CSS includes responsive rules, but these remain a future verification pass.
- **Product imagery:** An optional Supabase schema migration now supports a verified product image URL. The migration has not been applied to the user's database; until it is, only the explicitly illustrative known demo SKUs have images.

## Comparison history

- **Initial full-view capture:** `/demo` at desktop browser viewport; no clipping or typographic collisions observed. Also inspected drawer, filtered, searched, and selected states.
- **Combined-source review:** `/qa` displayed the primary source screenshot beside browser-rendered `ProductsWorkspace` in one browser screenshot. The first combined comparison used an iframe that did not render, so the local QA fixture was changed to render the actual React workspace component directly. A second screenshot then confirmed both panels visible. No deployed product code changed because of the QA fixture issue.
- **Focused region review:** The unscaled `/demo` screenshot was used to inspect the KPI card text, toolbar spacing, first table rows, status pills, and sidebar navigation because detail text was too small in the full-view side-by-side screenshot.
- **Product-image follow-up (2026-11-06):** The user requested product imagery. Six individual photo-style assets were generated and placed in the sample product catalogue. Browser captures at the same desktop viewport showed correctly aligned thumbnails, legible names/SKUs, and a larger image in the side drawer. An updated `/qa` side-by-side comparison confirmed the added image rhythm matches the supplied retail table inspiration. No P0/P1/P2 layout problems observed. No further fix iteration was required.

## Implementation checklist

- [x] Preserve StockDetective identity and its inventory investigation workflow.
- [x] Implement redesigned navigation, KPI cards, product table, filters, selection, export, and evidence drawer.
- [x] Browser-verify the most important desktop interactions.
- [x] Add photo thumbnails and a large detail preview, image-error empty state, accessible labels, and accurate/illustrative distinctions.
- [x] Pass the local production build and obtain a `READY` Vercel preview build.
- [ ] Verify `/products` against real Supabase data in the authenticated preview.
- [ ] Inspect responsive tablet and mobile layouts before wider release.
- [ ] Obtain user review and merge Draft PR #2 when ready.

## Follow-up polish (P3)

- Apply the optional product-image SQL migration and replace sample artwork with owner-approved real photos.
- Consider a compact skeleton state during long data loads.
- Optionally add a per-product discrepancy count breakdown in the drawer after the underlying data model supplies linked case details.
