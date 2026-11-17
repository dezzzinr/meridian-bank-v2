import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiError, readBody, requireAdmin, str } from "@/lib/api";
import { logNotification } from "@/lib/notify";

interface Ctx { params: Promise<{ id: string }> }

async function targetUser(ctx: Ctx) {
  const id = Number((await ctx.params).id);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const [record] = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    status: users.kycStatus,
    method: users.kycMethod,
    documentType: users.kycDocumentType,
    documentName: users.kycDocumentName,
    documentData: users.kycDocumentData,
    submittedAt: users.kycSubmittedAt,
    reviewedAt: users.kycReviewedAt,
    reviewNote: users.kycReviewNote,
  }).from(users).where(eq(users.id, id)).limit(1);
  return record ?? null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return apiError(403, "Admins only.");
  const record = await targetUser(ctx);
  if (!record || record.status === "not_started") return apiError(404, "KYC submission not found.");
  const { documentData, ...safeRecord } = record;
  const reviewDocument = record.status === "pending" ? documentData : null;
  return Response.json({ ...safeRecord, documentData: reviewDocument }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return apiError(403, "Admins only.");
  const record = await targetUser(ctx);
  if (!record || record.status === "not_started") return apiError(404, "KYC submission not found.");
  if (record.status !== "pending") return apiError(409, "Only submissions awaiting review can be updated.");
  const body = await readBody(req);
  const status = body.status;
  if (status !== "verified" && status !== "rejected") return apiError(400, "Choose verified or rejected.");
  const reviewNote = body.reviewNote == null || body.reviewNote === "" ? null : str(body.reviewNote, 1, 500);
  if (body.reviewNote != null && body.reviewNote !== "" && reviewNote === null) return apiError(400, "Review note must be 500 characters or fewer.");
  if (status === "rejected" && !reviewNote) return apiError(400, "Add a note explaining what the customer needs to update.");
  await db.update(users).set({ kycStatus: status, kycReviewedAt: new Date(), kycReviewNote: reviewNote, kycDocumentData: null }).where(eq(users.id, record.id));
  await logNotification({
    userId: record.id,
    type: "account",
    title: status === "verified" ? "Identity verification approved" : "Identity verification needs attention",
    body: status === "verified" ? "Your identity verification is complete." : reviewNote || "Your identity verification needs an update. Open Settings to review and resubmit.",
    createdBy: admin.id,
  });
  return Response.json({ ok: true, status });
}
