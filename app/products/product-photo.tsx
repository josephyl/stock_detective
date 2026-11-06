"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function ProductPhoto({
  src,
  name,
  illustrative = false,
  large = false,
}: {
  src: string | null;
  name: string;
  illustrative?: boolean;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  return (
    <div className={`product-photo ${large ? "large" : "thumb"}${!src || failed ? " missing" : ""}`}>
      {src && !failed ? (
        <Image
          src={src}
          alt={illustrative ? `Illustrative image for ${name}, not verified packaging` : name}
          title={illustrative ? "Illustrative product image — not verified packaging" : name}
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
