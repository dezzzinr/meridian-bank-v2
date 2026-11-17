import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiError, requireUser } from "@/lib/api";

const DOCUMENT_TYPES = new Set(["passport", "national_id", "drivers_license", "residence_permit"]);
const MAX_DOCUMENT_BYTES = 1_500_000;

export async function GET() {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to sign in.");
  const [record] = await db.select({
    status: users.kycStatus,
    method: users.kycMethod,
    documentType: users.kycDocumentType,
    documentName: users.kycDocumentName,
    submittedAt: users.kycSubmittedAt,
    reviewedAt: users.kycReviewedAt,
    reviewNote: users.kycReviewNote,
    hasDocument: users.kycDocumentData,
  }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!record) return apiError(404, "Account not found.");
  return Response.json({ ...record, hasDocument: Boolean(record.hasDocument) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to sign in.");

  const [existing] = await db.select({ status: users.kycStatus }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!existing) return apiError(404, "Account not found.");
  if (existing.status === "verified") return apiError(409, "Your identity is already verified.");
  if (existing.status === "pending") return apiError(409, "Your verification is already under review.");

  let form: FormData;
  try { form = await req.formData(); } catch { return apiError(400, "Choose an identity document to upload."); }
  const documentType = String(form.get("documentType") ?? "");
  const confirmed = form.get("confirmProfileDetails") === "true";
  const file = form.get("document");
  if (!DOCUMENT_TYPES.has(documentType)) return apiError(400, "Choose a supported identity document type.");
  if (!confirmed) return apiError(400, "Confirm your profile details before submitting KYC.");
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_DOCUMENT_BYTES) return apiError(400, "Upload a file smaller than 1.5 MB.");
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) return apiError(400, "Upload a JPG, PNG, or PDF document.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const documentData = `data:${file.type};base64,${bytes.toString("base64")}`;
  const documentName = file.name.replace(/[\r\n\\/]/g, "_").slice(0, 120) || "identity-document";
  await db.update(users).set({
    kycStatus: "pending",
    kycMethod: "document",
    kycDocumentType: documentType,
    kycDocumentName: documentName,
    kycDocumentData: documentData,
    kycSubmittedAt: new Date(),
    kycReviewedAt: null,
    kycReviewNote: null,
  }).where(eq(users.id, user.id));
  return Response.json({ ok: true, status: "pending" }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
