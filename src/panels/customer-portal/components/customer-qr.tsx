"use client";

import { useEffect, useState } from "react";
import type { PortalQr } from "@/modules/customer-portal/types";
import { Button } from "@/shared/ui/button";
import { renderMemberQrImage } from "@/shared/lib/member-qr-image";

/** Read-only membership QR for the signed-in customer. */
export function CustomerQr({ qr }: { qr: PortalQr }) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    void renderMemberQrImage({ code: qr.code, holderName: qr.holderName, vipNumber: qr.vipNumber }).then((data) => {
      if (!disposed) setSrc(data);
    }).catch(() => {
      if (!disposed) setError("Could not create the QR image.");
    });
    return () => { disposed = true; };
  }, [qr.code, qr.holderName, qr.vipNumber]);

  return (
    <div className="customer-portal__qr">
      {error ? <p role="alert">{error}</p> : null}
      {src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`Membership QR for ${qr.holderName}, ${qr.vipNumber}`} width={360} height={324} className="customer-portal__qr-image" />
          <Button variant="outline" render={<a href={src} download={`afhomes-${qr.vipNumber}-${qr.holder}.png`} />} nativeButton={false}>Download QR</Button>
        </>
      ) : <p role="status" className="customer-portal__empty">Creating QR…</p>}
    </div>
  );
}
