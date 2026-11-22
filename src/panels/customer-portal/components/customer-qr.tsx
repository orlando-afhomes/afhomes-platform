"use client";

import { useEffect, useState } from "react";
import type { PortalQr } from "@/modules/customer-portal/types";
import { Button } from "@/shared/ui/button";

/** Read-only membership QR for the signed-in customer. */
export function CustomerQr({ qr }: { qr: PortalQr }) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    void import("qrcode").then(async ({ toDataURL }) => {
      const data = await toDataURL(qr.code, { width: 440, margin: 2, errorCorrectionLevel: "H" });
      if (!disposed) setSrc(data);
    }).catch(() => {
      if (!disposed) setError("Could not create the QR image.");
    });
    return () => { disposed = true; };
  }, [qr.code]);

  return (
    <div className="customer-portal__qr">
      {error ? <p role="alert">{error}</p> : null}
      {src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`Membership QR for ${qr.holderName}, ${qr.vipNumber}`} width={220} height={220} className="customer-portal__qr-image" />
          <p className="customer-portal__qr-name"><strong>{qr.holderName}</strong><br />{qr.vipNumber}</p>
          <Button variant="outline" render={<a href={src} download={`afhomes-${qr.vipNumber}-${qr.holder}.png`} />} nativeButton={false}>Download QR</Button>
        </>
      ) : <p role="status" className="customer-portal__empty">Creating QR…</p>}
    </div>
  );
}
