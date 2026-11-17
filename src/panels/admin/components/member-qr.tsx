"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ScanLine } from "lucide-react";
import type { MemberQrHolder, MemberQrCode } from "@/data/contracts/member-qr-repository";
import { useOperation } from "@/data/business-queries";
import { useMockRepositories } from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { activeRoles } from "@/data/mock/dev-identities";
import { queryKeys } from "@/data/query-keys";

export function MemberQrButton({ membershipId, lookupShortcut = false }: { membershipId: string; lookupShortcut?: boolean }) {
  const [open, setOpen] = useState(false);
  const allowed = useOperation("customers.lookup");
  const { identity } = useDevIdentity();
  if (!allowed) return null;
  return <>
    <Button type="button" variant="outline" className={lookupShortcut ? "customer-lookup__shortcut" : undefined} onClick={() => setOpen(true)}>
      {lookupShortcut ? <ScanLine aria-hidden="true" /> : null}<span>Show QR</span>{lookupShortcut ? <ChevronRight aria-hidden="true" /> : null}
    </Button>
    {open ? <MemberQrDialog key={identity.id + membershipId} membershipId={membershipId} close={() => setOpen(false)} /> : null}
  </>;
}

function MemberQrDialog({ membershipId, close }: { membershipId: string; close: () => void }) {
  const { memberQr } = useMockRepositories();
  const { identity } = useDevIdentity();
  const queryClient = useQueryClient();
  const key = ["member-qr", identity.id, membershipId];
  const query = useQuery({ queryKey: key, queryFn: () => memberQr.holders(membershipId) });
  const replace = useMutation({
    mutationFn: (holder: MemberQrCode["holder"]) => memberQr.replace(membershipId, holder),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
    },
  });
  const { confirmRun, dialog } = useConfirmRun();
  const canReplace = activeRoles(identity).some((role) => role === "admin" || role === "super_admin");
  return <>
    <Dialog open onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="tw:max-h-[90dvh] tw:overflow-auto">
        <DialogHeader>
          <DialogTitle>Membership QR</DialogTitle>
          <DialogDescription>Present this code to AFhomes staff.</DialogDescription>
        </DialogHeader>
        {query.isPending ? <p role="status">Loading QR codes…</p> : null}
        {query.isError ? <p role="alert">{query.error.message}</p> : null}
        {query.data?.length === 0 ? <p>No active cardholders.</p> : null}
        {query.data?.map((holder) => <QrImage key={holder.code} holder={holder} replace={canReplace ? () => confirmRun({
          title: "Replace membership QR?",
          description: `The previous QR for ${holder.holderName} will stop working.`,
          confirmText: "Replace QR",
          action: () => replace.mutateAsync(holder.holder),
          successTitle: "QR replaced.",
          errorTitle: "Could not replace the QR.",
        }) : undefined} />)}
      </DialogContent>
    </Dialog>
    {dialog}
  </>;
}

function QrImage({ holder, replace }: { holder: MemberQrCode; replace?: () => void }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    void import("qrcode").then(async ({ toCanvas }) => {
      const qr = document.createElement("canvas");
      // High error correction keeps the code readable around the small center mark.
      await toCanvas(qr, holder.code, { scale: 5, margin: 4, errorCorrectionLevel: "H" });
      const logo = new Image();
      logo.src = "/images/member-qr-logo.jpg";
      await logo.decode();
      const card = document.createElement("canvas");
      card.width = 360;
      card.height = 324;
      const context = card.getContext("2d");
      if (!context) throw new Error("Could not create the QR image.");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, card.width, card.height);
      context.drawImage(qr, Math.floor((card.width - qr.width) / 2), 0);

      const logoSize = 32;
      const logoX = (card.width - logoSize) / 2;
      const logoY = Math.floor((qr.height - logoSize) / 2);
      const padding = 3;
      context.fillRect(logoX - padding, logoY - padding, logoSize + 2 * padding, logoSize + 2 * padding);

      context.drawImage(logo, logoX, logoY, logoSize, logoSize);
      context.fillStyle = "#111";
      context.textAlign = "center";
      context.font = "bold 18px sans-serif";
      context.fillText(holder.holderName, 180, 278, 328);
      context.font = "16px sans-serif";
      context.fillText(holder.vipNumber, 180, 304, 328);
      if (!disposed) setImage(card.toDataURL("image/png"));
    }).catch(() => { if (!disposed) setError("Could not create the QR image."); });
    return () => { disposed = true; };
  }, [holder]);

  function print() {
    const page = window.open("", "_blank", "width=500,height=540");
    if (!page) return setError("Allow pop-ups to print this QR.");
    page.opener = null;
    page.document.title = "AFhomes membership QR";
    const output = page.document.createElement("img");
    output.alt = `Membership QR for ${holder.holderName}`;
    output.onload = () => { page.focus(); page.print(); };
    page.document.body.append(output);
    output.src = image;
  }

  return <section className="tw:space-y-2">
    {error ? <p role="alert">{error}</p> : null}
    {image ? <>
      {/* The canvas image is local to this browser session. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={`Membership QR for ${holder.holderName}, ${holder.vipNumber}`} width={360} height={324} className="tw:h-auto tw:max-w-full" />
      <div className="tw:flex tw:flex-wrap tw:gap-2">
        <Button variant="outline" render={<a href={image} download={`afhomes-${holder.vipNumber}-${holder.holder}.png`} />} nativeButton={false}>Download QR</Button>
        <Button type="button" variant="outline" onClick={print}>Print QR</Button>
        {replace ? <Button type="button" variant="outline" onClick={replace}>Replace QR</Button> : null}
      </div>
    </> : null}
  </section>;
}

export function ScanMemberQrButton({ onSelect }: { onSelect: (holder: MemberQrHolder) => void }) {
  const [open, setOpen] = useState(false);
  const allowed = useOperation("customers.lookup");
  return allowed ? <>
    <Button type="button" variant="outline" onClick={() => setOpen(true)}><ScanLine aria-hidden="true" /> Scan QR</Button>
    {open ? <Scanner close={() => setOpen(false)} select={(holder) => { onSelect(holder); setOpen(false); }} /> : null}
  </> : null;
}

function Scanner({ close, select }: { close: () => void; select: (holder: MemberQrHolder) => void }) {
  const { memberQr } = useMockRepositories();
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [error, setError] = useState("");
  const onSelect = useRef(select);
  useEffect(() => { onSelect.current = select; }, [select]);
  useEffect(() => {
    if (!video) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setError("Camera unavailable. Close this window to look up the member manually."));
      return;
    }
    let closed = false;
    let checking = false;
    let lastCode = "";
    let controls: { stop: () => void } | undefined;

    void import("@zxing/browser").then(async ({ BrowserQRCodeReader }) => {
      if (closed) return;
      const reader = new BrowserQRCodeReader();
      controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } }, video,
        (result, _, scanner) => {
          const code = result?.getText();
          if (closed || checking || !code || code === lastCode) return;
          checking = true;
          lastCode = code;
          void memberQr.resolve(code).then((holder) => {
            if (closed) return;
            scanner.stop();
            onSelect.current(holder);
          }).catch((failure: Error) => {
            if (!closed) setError(failure.message);
          }).finally(() => { checking = false; });
        },
      );
      if (closed) controls.stop();
    }).catch(() => {
      if (!closed) setError("Camera unavailable. Allow camera access or close this window to look up the member manually.");
    });

    return () => {
      closed = true;
      controls?.stop();
      const stream = video.srcObject;
      if (typeof MediaStream !== "undefined" && stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [memberQr, video]);

  return <Dialog open onOpenChange={(next) => { if (!next) close(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Scan membership QR</DialogTitle>
        <DialogDescription>Point the camera at the QR on the card or phone.</DialogDescription>
      </DialogHeader>
      <video ref={setVideo} aria-label="Camera preview" muted playsInline className="tw:aspect-video tw:w-full tw:rounded-md tw:bg-black" />
      {error ? <p role="alert">{error}</p> : null}
      <Button type="button" variant="outline" onClick={close}>Use manual lookup</Button>
    </DialogContent>
  </Dialog>;
}
