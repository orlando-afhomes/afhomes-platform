export type MemberQrImageInput = { code: string; holderName: string; vipNumber: string };

/**
 * Draws the membership QR image: the code with the AFhomes mark in the center, then the holder name and VIP number.
 * Shared by the staff "Show QR" dialog and the customer portal so both show the same image.
 */
export async function renderMemberQrImage({ code, holderName, vipNumber }: MemberQrImageInput): Promise<string> {
  const { toCanvas } = await import("qrcode");
  const qr = document.createElement("canvas");
  // High error correction keeps the code readable around the small center mark.
  await toCanvas(qr, code, { scale: 5, margin: 4, errorCorrectionLevel: "H" });
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
  context.fillText(holderName, 180, 278, 328);
  context.font = "16px sans-serif";
  context.fillText(vipNumber, 180, 304, 328);
  return card.toDataURL("image/png");
}
