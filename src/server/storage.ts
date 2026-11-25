import "server-only";
import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { ApiError } from "@/server/api/errors";
import { getAdminApp } from "@/server/firebase-admin";
import { dbRead } from "@/server/db";
import { paymentEvidenceOf, type PaymentEvidenceMeta } from "@/server/repositories/records";
import type { Actor } from "@/server/auth/actor";
import { invalid, notFound, nowIso, transact } from "@/server/services/common";

export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

const TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
} as const;

type EvidenceType = keyof typeof TYPES;

/** Reads the bytes, not the browser-reported type. JPEG, PNG and PDF only. */
export function detectEvidenceType(bytes: Buffer): EvidenceType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  return null;
}

/** A display name derived from the browser's, with path characters and quotes removed; the stored path never uses it. */
function displayName(original: string | null, extension: string): string {
  const cleaned = (original ?? "").split(/[\\/]/).pop()?.replace(/[^\w.\- ()]/g, "").trim().slice(0, 120) ?? "";
  return cleaned || `receipt.${extension}`;
}

function bucket() {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-afhomes";
  if (projectId.startsWith("demo-") && !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    throw new Error("Demo project needs FIREBASE_STORAGE_EMULATOR_HOST (run with scripts/api-local.env).");
  }
  return getStorage(getAdminApp()).bucket(process.env.FIREBASE_STORAGE_BUCKET ?? `${projectId}.appspot.com`);
}

type PaymentDetailsRow = { payment: { details: Record<string, unknown> | null; contract: { id: string } | null } | null; };

async function loadDetails(paymentId: string) {
  return dbRead<PaymentDetailsRow>(`query($id: UUID!) { payment(id: $id) { details contract { id } } }`, { id: paymentId });
}

/** The public part of the metadata; the storage path and uploader stay on the server. */
export type UploadedEvidence = Pick<PaymentEvidenceMeta, "fileId" | "fileName" | "size" | "contentType" | "uploadedAt">;

/**
 * Stores one receipt file in the private bucket and records its metadata on the payment in the same
 * transaction as the audit entry. The caller has already checked that the actor may see the payment.
 */
export async function attachPaymentEvidence(actor: Actor, paymentId: string, bytes: Buffer, originalName: string | null): Promise<UploadedEvidence> {
  const found = await loadDetails(paymentId);
  if (!found.payment) throw notFound("Payment");
  if (bytes.length === 0) throw invalid("The file is empty.");
  if (bytes.length > MAX_EVIDENCE_BYTES) throw new ApiError(413, "file_too_large", "Attach a file of 5 MB or less.");
  const contentType = detectEvidenceType(bytes);
  if (!contentType) throw invalid("Attach a JPEG, PNG or PDF file.");
  const previous = paymentEvidenceOf(found.payment.details);
  const fileId = randomUUID();
  const storagePath = `payments/${paymentId}/${fileId}.${TYPES[contentType]}`;
  const meta: PaymentEvidenceMeta = {
    fileId, storagePath, fileName: displayName(originalName, TYPES[contentType]), size: bytes.length, contentType, uploadedBy: actor.userId, uploadedAt: nowIso(),
  };
  const file = bucket().file(storagePath);
  await file.save(bytes, { contentType, resumable: false, metadata: { metadata: { paymentId, uploaderId: actor.userId } } });
  try {
    await transact(actor, {
      variableDefinitions: "$id: UUID!, $details: Any!",
      fields: "payment: payment_update(id: $id, data: { details: $details })",
      variables: { id: paymentId, details: { ...(found.payment.details ?? {}), evidence: meta } },
      audit: [{
        action: BUSINESS_AUDIT_ACTIONS.PAYMENT_EVIDENCE_UPLOADED,
        entityType: "payment",
        entityId: paymentId,
        details: { module: "finance", newValue: contentType, relatedRecordIds: found.payment.contract ? [found.payment.contract.id] : [] },
      }],
    });
  } catch (error) {
    // The database write failed, so the new object is unreferenced.
    await file.delete().catch(() => undefined);
    throw error;
  }
  // Replacing a receipt removes the earlier object; a failure here only leaves an unreferenced file.
  if (previous && previous.storagePath !== storagePath) await bucket().file(previous.storagePath).delete().catch(() => undefined);
  return { fileId: meta.fileId, fileName: meta.fileName, size: meta.size, contentType: meta.contentType, uploadedAt: meta.uploadedAt };
}

/** Reads the current receipt file after the route has checked that the actor may see the payment. */
export async function downloadPaymentEvidence(paymentId: string, fileId: string): Promise<{ bytes: Buffer; meta: PaymentEvidenceMeta }> {
  const found = await loadDetails(paymentId);
  const meta = paymentEvidenceOf(found.payment?.details ?? null);
  if (!found.payment || !meta || meta.fileId !== fileId) throw notFound("Receipt file");
  try {
    const [bytes] = await bucket().file(meta.storagePath).download();
    return { bytes, meta };
  } catch (error) {
    if ((error as { code?: number }).code === 404) throw notFound("Receipt file");
    throw error;
  }
}

// ---------------------------------------------------------------- customer identity images
const IMAGE_EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png" } as const;
export const MAX_CUSTOMER_ID_BYTES = 5 * 1024 * 1024;

/** Server-only metadata for the private government ID image. The client sees an authenticated URL, never the path. */
export type CustomerIdentityFile = { fileId: string; storagePath: string; fileName: string; size: number; contentType: string; uploadedAt: string; uploadedBy: string };

export function customerIdentityFileOf(profile: Record<string, unknown> | null | undefined): CustomerIdentityFile | null {
  const file = profile?.identityFile as Partial<CustomerIdentityFile> | undefined;
  if (!file || typeof file.fileId !== "string" || typeof file.storagePath !== "string") return null;
  return {
    fileId: file.fileId,
    storagePath: file.storagePath,
    fileName: typeof file.fileName === "string" ? file.fileName : "government-id.jpg",
    size: typeof file.size === "number" ? file.size : 0,
    contentType: typeof file.contentType === "string" ? file.contentType : "image/jpeg",
    uploadedAt: typeof file.uploadedAt === "string" ? file.uploadedAt : "",
    uploadedBy: typeof file.uploadedBy === "string" ? file.uploadedBy : "",
  };
}

/**
 * Stores the customer's government ID image in the private bucket and records only its metadata on the
 * customer in the same transaction as the audit entry. The caller has already checked record access.
 */
export async function attachCustomerIdentityImage(actor: Actor, customerId: string, profile: Record<string, unknown> | null, bytes: Buffer, originalName: string | null) {
  if (bytes.length === 0) throw invalid("The file is empty.");
  if (bytes.length > MAX_CUSTOMER_ID_BYTES) throw new ApiError(413, "file_too_large", "Attach an image of 5 MB or less.");
  const detected = detectEvidenceType(bytes);
  if (!detected || !(detected in IMAGE_EXTENSIONS)) throw invalid("Attach a JPEG or PNG image.");
  const contentType = detected as keyof typeof IMAGE_EXTENSIONS;
  const previous = customerIdentityFileOf(profile);
  const fileId = randomUUID();
  const storagePath = `customers/${customerId}/identity/${fileId}.${IMAGE_EXTENSIONS[contentType]}`;
  const meta: CustomerIdentityFile = {
    fileId,
    storagePath,
    fileName: displayName(originalName, IMAGE_EXTENSIONS[contentType]),
    size: bytes.length,
    contentType,
    uploadedAt: nowIso(),
    uploadedBy: actor.userId,
  };
  const file = bucket().file(storagePath);
  await file.save(bytes, { contentType, resumable: false, metadata: { metadata: { customerId, uploaderId: actor.userId } } });
  try {
    await transact(actor, {
      variableDefinitions: "$id: UUID!, $profile: Any!",
      fields: "customer: customer_update(id: $id, data: { profile: $profile })",
      variables: { id: customerId, profile: { ...(profile ?? {}), identityFile: meta } },
      audit: [{ action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_ID_IMAGE_UPLOADED, entityType: "customer", entityId: customerId, details: { module: "customers", newValue: contentType } }],
    });
  } catch (error) {
    await file.delete().catch(() => undefined);
    throw error;
  }
  if (previous && previous.storagePath !== storagePath) await bucket().file(previous.storagePath).delete().catch(() => undefined);
  return { fileId: meta.fileId, fileName: meta.fileName, size: meta.size, contentType: meta.contentType, uploadedAt: meta.uploadedAt };
}

/** Reads the private ID image after the route checked that the actor may see the customer. */
export async function downloadCustomerIdentityImage(customerId: string, profile: Record<string, unknown> | null, fileId: string): Promise<{ bytes: Buffer; meta: CustomerIdentityFile }> {
  const meta = customerIdentityFileOf(profile);
  if (!meta || meta.fileId !== fileId) throw notFound("Identity image");
  try {
    const [bytes] = await bucket().file(meta.storagePath).download();
    return { bytes, meta };
  } catch (error) {
    if ((error as { code?: number }).code === 404) throw notFound("Identity image");
    throw error;
  }
}

/** Best effort cleanup when a draft that never had a file is discarded; an unreferenced object is harmless. */
export async function deleteCustomerIdentityFile(profile: Record<string, unknown> | null): Promise<void> {
  const meta = customerIdentityFileOf(profile);
  if (!meta) return;
  await bucket().file(meta.storagePath).delete().catch(() => undefined);
}
