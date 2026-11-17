import { desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiError, requireAdmin } from "@/lib/api";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return apiError(403, "Admins only.");
  const records = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    status: users.kycStatus,
    method: users.kycMethod,
    documentType: users.kycDocumentType,
    documentName: users.kycDocumentName,
    submittedAt: users.kycSubmittedAt,
    reviewedAt: users.kycReviewedAt,
    reviewNote: users.kycReviewNote,
  }).from(users).where(ne(users.kycStatus, "not_started")).orderBy(desc(users.kycSubmittedAt));
  return Response.json({ records }, { headers: { "Cache-Control": "no-store" } });
}
