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

Other SKUs have no automatic guessed photo. They show **No image** until one is linked, avoiding a false match.

If a remote image becomes unavailable, the thumbnail component falls back to **No image** without disrupting the product table.
