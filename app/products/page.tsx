import { createAdminClient } from "@/lib/supabase/admin";
import ProductsWorkspace from "./products-workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type ProductInventoryRow = {
  id: string;
  sku: string;
  name: string;
  imageUrl: string | null;
  imageIsIllustrative: boolean;
  imageIsRepresentative: boolean;
  imageCaption: string | null;
  imageSourceUrl: string | null;
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

// These demo SKUs are shipped with clearly labelled illustrative artwork.
// A real product photo from canonical_products.image_url always wins.
const illustrativeImages: Record<string, string> = {
  "HH-MGO550-500": "/product-samples/mgo550.webp",
  "HH-MGO250-250": "/product-samples/mgo250.webp",
  "PR-SPRAY-30": "/product-samples/propolis.webp",
  "RJ-CAP-60": "/product-samples/royal-jelly.webp",
  "HC-350": "/product-samples/honeycomb.webp",
  "BB-LIP-15": "/product-samples/lip-balm.webp",
};

// Curated photographs of real, publicly listed products. These are matched
// individually to the catalogue SKU, never by an unreliable text-image search.
// An image_url explicitly verified in Supabase still takes precedence.
const sourcedProductPhotos: Record<string, {
  src: string;
  caption: string;
  sourceUrl: string;
  representative?: boolean;
}> = {
  "BH-OMEGA-180": {
    src: "/product-verified/blue-hills-omega.webp",
    caption: "Category reference only: real omega-3 fish-oil softgels. This is not Blue Hills packaging; an exact Blue Hills Omega 3 180-capsule listing could not be verified.",
    sourceUrl: "https://www.rosacea.org/blog/2024/july/vitamins-and-minerals-may-play-role-in-rosacea-therapy",
    representative: true,
  },
  "BH-VITD-100": {
    src: "/product-verified/blue-hills-vitamin-d-photo.webp",
    caption: "Category reference only: real vitamin D softgel capsules. This is not Blue Hills packaging; an exact Blue Hills Vitamin D 100-capsule listing could not be verified.",
    sourceUrl: "https://www.news-medical.net/news/20230704/Vitamin-D-supplementation-reduces-risk-of-major-cardiovascular-events-in-older-adults.aspx",
    representative: true,
  },
  "GN-COLLAGEN-30": {
    src: "/product-verified/goodlife-collagen.webp",
    caption: "Representative Goodlife product: Ultra Collagen 100 capsules. This is NOT the catalogue record's Collagen 30 Sachets packaging.",
    sourceUrl: "https://goodlifenutritionhealth.com.au/products/ultra-collagen",
    representative: true,
  },
  "GN-PROBIOTIC-60": {
    src: "/product-verified/goodlife-probiotic.webp",
    caption: "Representative Goodlife product: Probiotics Enzymes Plus, 60 hard capsules. It includes digestive enzymes and may differ from this generic 60-capsule entry.",
    sourceUrl: "https://goodlifenutritionhealth.com.au/products/probiotics-enzymes-plus",
    representative: true,
  },
  "HH-MGO100-500": {
    src: "/product-verified/haddrells-umf5-250g.webp",
    caption: "Representative Haddrell's product: UMF 5+ / MGO 83+ 250g. The catalogue record says MGO 100+ 500g, so neither rating nor package size is identical.",
    sourceUrl: "https://zywiolzdrowia.pl/products/miod-manuka-umf-5-mgo-83-250-g-haddrells-of-cambridge",
    representative: true,
  },
  "HH-MGO400-500": {
    src: "/product-verified/haddrells-umf13-mgo404-500g.webp",
    caption: "Haddrell's UMF 13+ / MGO 404+ · 500g. Manufacturer-labelled 404+ within this 400+ product tier.",
    sourceUrl: "https://www.robinsons.com.sg/products/haddrells-of-cambridge-manuka-honey-umf%C2%AE-13-500g",
  },
  "HH-MGO550-500": {
    src: "/product-verified/haddrells-umf16-mgo570-500g.webp",
    caption: "Reference photo only: Haddrell's UMF 16+ / MGO 570+ · 500g. The catalogue record says MGO 550+; verify packaging before using commercially.",
    sourceUrl: "https://www.manukacanada.ca/products/haddrells-manuka-honey-umf-16",
    representative: true,
  },
  "TOP-ROYAL-60": {
    src: "/product-verified/toplife-royal-jelly-365.webp",
    caption: "Representative Top Life product: Royal Jelly 1000 Max 2.2% HDA, 365 capsules. This differs from the 60-capsule catalogue entry.",
    sourceUrl: "https://www.beevitamins.com.au/products/top-life-royal-jelly-1000-max-2-2-hda-premium-quality-365-capsules",
    representative: true,
  },
  "WH-CALCIUM-120": {
    src: "/product-verified/wealthy-health-calcium.webp",
    caption: "Representative Wealthy Health product: Bio-Calcium Liquid soft capsules. This is not confirmed to be the catalogue's Calcium 120 Tablets.",
    sourceUrl: "https://www.wealthyhealth.com.au/product-page/bio-calcium-liquid-1",
    representative: true,
  },
  "WH-LUTEIN-60": {
    src: "/product-verified/wealthy-health-lutein.webp",
    caption: "Representative Wealthy Health product: Maxi-Visual Guard with bilberry, lutein and eyebright, 60 soft capsules; the formula name differs from this catalogue entry.",
    sourceUrl: "https://www.wealthyhealth.com.au/product-page/maxi-visual-guard-bilberry-10000-plus-eye-health-tablets",
    representative: true,
  },
};

function safeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const src = value.trim();
  if (src.startsWith("https://")) return src;
  if (src.startsWith("/") && !src.startsWith("//") && !src.includes("\\")) return src;
  return null;
}

export default async function ProductsPage() {
  const supabase = createAdminClient();
  const [productsResult, recordsResult, issuesResult, importsResult] = await Promise.all([
    // SELECT * keeps the view compatible with existing databases that have not
    // yet applied the optional image_url column migration.
    supabase.from("canonical_products").select("*").order("name").limit(500),
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
    const verifiedImage = safeImageUrl(product.image_url);
    const sourcedPhoto = sourcedProductPhotos[product.sku];
    const useSourcedPhoto = !verifiedImage && Boolean(sourcedPhoto);
    const useIllustration = !verifiedImage && !sourcedPhoto && Boolean(illustrativeImages[product.sku]);
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
      imageUrl: verifiedImage ?? sourcedPhoto?.src ?? illustrativeImages[product.sku] ?? null,
      imageIsIllustrative: useIllustration,
      imageIsRepresentative: useSourcedPhoto && Boolean(sourcedPhoto?.representative),
      imageCaption: useSourcedPhoto ? sourcedPhoto.caption : null,
      imageSourceUrl: useSourcedPhoto ? sourcedPhoto.sourceUrl : null,
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
