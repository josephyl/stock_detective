# Product photos in StockDetective

The Products page shows a 46 × 46 px thumbnail beside each item and a larger image in its evidence drawer.

## Accurate images

StockDetective's current Supabase schema stores SKU/name/stock evidence, but not product photos. The UI works without a schema change: missing images show a calm **No image** state.

To link real photos to products:

1. Run `supabase/product-images.sql` in the Supabase SQL editor. It only adds the optional `canonical_products.image_url` column and does not change stock calculations.
2. Put product photographs in a stable HTTPS location, for example a public Supabase Storage `product-images` bucket that you manage.
3. Save the correct image URL against each SKU. Example:

   ```sql
   update public.canonical_products
   set image_url = 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/product-images/HH-MGO550-500.webp'
   where sku = 'HH-MGO550-500';
   ```

The page automatically prioritises `image_url` when present. Only use photos whose identity/packaging has been checked against the corresponding SKU and which you have permission to use.

## Illustrative examples

The six known demonstration SKUs have generated, **illustrative** thumbnail assets in `public/product-samples/`. These are not manufacturer photos and do not represent verified branded packaging. Their detail panels explicitly label them as illustrative. A real `image_url` overrides the illustration.

## Curated real product photos (6 November 2026)

The ten catalogue SKUs shown in the supplied screenshot now have real online photographs. These are **not all photos of the exact catalogue SKU**: nine show an explicitly marked representative variant or unbranded category photograph, and one matches the named Haddrell's 400+ product tier. The user approved representative imagery for the academic demonstration. Each mismatched row says **Representative photo** and its detail drawer identifies the pictured product, explains the difference, and links to the source.

Images are local optimised WebP assets (no remote hotlink dependency). The source links are maintained below.

| Catalogue SKU | Local image | Source | Variant accuracy |
| --- | --- | --- | --- |
| `BH-OMEGA-180` | `blue-hills-omega.webp` | [Rosacea.org](https://www.rosacea.org/blog/2024/july/vitamins-and-minerals-may-play-role-in-rosacea-therapy) | **Category reference only:** unbranded photographed omega-3 softgels, not Blue Hills packaging. |
| `BH-VITD-100` | `blue-hills-vitamin-d-photo.webp` | [News-Medical](https://www.news-medical.net/news/20230704/Vitamin-D-supplementation-reduces-risk-of-major-cardiovascular-events-in-older-adults.aspx) | **Category reference only:** unbranded photographed vitamin D softgels, not Blue Hills packaging. |
| `GN-COLLAGEN-30` | `goodlife-collagen.webp` | [Goodlife Health Nutrition](https://goodlifenutritionhealth.com.au/products/ultra-collagen) | **Representative only:** Ultra Collagen 100 capsules, not 30 sachets. |
| `GN-PROBIOTIC-60` | `goodlife-probiotic.webp` | [Goodlife Health Nutrition](https://goodlifenutritionhealth.com.au/products/probiotics-enzymes-plus) | **Representative only:** Probiotics Enzymes Plus 60 capsules, not necessarily the exact formula. |
| `HH-MGO100-500` | `haddrells-umf5-250g.webp` | [Żywioł Zdrowia](https://zywiolzdrowia.pl/products/miod-manuka-umf-5-mgo-83-250-g-haddrells-of-cambridge) | **Representative only:** MGO83+/UMF5+ 250g rather than MGO100+ 500g. |
| `HH-MGO400-500` | `public/product-verified/haddrells-umf13-mgo404-500g.webp` | [Robinsons Singapore](https://www.robinsons.com.sg/products/haddrells-of-cambridge-manuka-honey-umf%C2%AE-13-500g) | Actual Haddrell's 500g product, labelled MGO404+/UMF13+; corresponds to the record's MGO400+ tier. |
| `HH-MGO550-500` | `public/product-verified/haddrells-umf16-mgo570-500g.webp` | [Manuka Canada](https://www.manukacanada.ca/products/haddrells-manuka-honey-umf-16) | **Representative only.** Actual Haddrell's 500g product is labelled MGO570+/UMF16+, not the dataset's MGO550+. Drawer warns of the distinction. |
| `TOP-ROYAL-60` | `toplife-royal-jelly-365.webp` | [BeeVitamins](https://www.beevitamins.com.au/products/top-life-royal-jelly-1000-max-2-2-hda-premium-quality-365-capsules) | **Representative only:** Top Life Royal Jelly 365 rather than 60 capsules. |
| `WH-CALCIUM-120` | `wealthy-health-calcium.webp` | [Wealthy Health](https://www.wealthyhealth.com.au/product-page/bio-calcium-liquid-1) | **Representative only:** Bio-Calcium Liquid capsules, not the requested calcium tablets. |
| `WH-LUTEIN-60` | `wealthy-health-lutein.webp` | [Wealthy Health](https://www.wealthyhealth.com.au/product-page/maxi-visual-guard-bilberry-10000-plus-eye-health-tablets) | **Representative only:** Maxi-Visual Guard 60 capsules, with lutein among its ingredients. |

Unless explicitly shown as a longer path, local image filenames above are under `public/product-verified/`.

These photographs are provided as source-attributed catalogue references for this demonstration. Public/commercial distribution requires confirming usage rights with the rights holders.

Targeted public searches did **not** reliably establish exact photos for the eight representative entries listed above. The two Blue Hills records use unbranded photographs of the supplement type because no Blue Hills-branded omega-3/vitamin-D listing could be verified. Do not present any representative image as manufacturer-verified packaging in a commercial catalogue.

The real image column `canonical_products.image_url` always wins over curated fallback photos, so correcting the photo does not require a code change.

If a remote image becomes unavailable, the thumbnail component falls back to **No image** without disrupting the product table.
