"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function ProductPhoto({
  src,
  name,
  illustrative = false,
  representative = false,
  large = false,
}: {
  src: string | null;
  name: string;
  illustrative?: boolean;
  representative?: boolean;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  return (
    <div className={`product-photo ${large ? "large" : "thumb"}${!src || failed ? " missing" : ""}${representative ? " representative" : ""}`}>
      {src && !failed ? (
        <Image
          src={src}
          alt={illustrative ? `Illustrative image for ${name}, not verified packaging` : representative ? `Reference packaging for ${name} — photographed product differs from catalogue variant` : name}
          title={illustrative ? "Illustrative product image — not verified packaging" : representative ? "Real product photo of a similar variant — check product details" : name}
          fill
          sizes={large ? "320px" : "44px"}
          style={{ objectFit: "contain" }}
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label={`No product photo available for ${name}`}>No image</span>
      )}
    </div>
  );
}
