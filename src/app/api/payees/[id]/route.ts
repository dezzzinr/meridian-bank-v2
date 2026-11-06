import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payees } from "@/db/schema";
import { apiError, readBody, requireUser, str } from "@/lib/api";

interface Ctx {
  params: Promise<{ id: string }>;
}

const METHOD_TYPES = ["bank", "email", "mobile"] as const;

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to be signed in.");
  const { id } = await ctx.params;
  const body = await readBody(req);

  const name = body.name !== undefined ? str(body.name, 1, 60) : undefined;
  const methodDetail =
    body.methodDetail !== undefined ? str(body.methodDetail, 1, 80) : undefined;
  const notes =
    body.notes !== undefined ? (str(body.notes, 0, 140) ?? "") : undefined;
  const methodType =
    body.methodType !== undefined &&
    (METHOD_TYPES as readonly string[]).includes(String(body.methodType))
      ? (body.methodType as string)
      : undefined;

  if (name !== undefined && !name) return apiError(400, "Payee name is required.");
  if (methodDetail !== undefined && !methodDetail) {
    return apiError(400, "Add the bank, email, or number to pay.");
  }

  const patch: Record<string, unknown> = {};
  if (name) patch.name = name;
  if (methodDetail) patch.methodDetail = methodDetail;
  if (notes !== undefined) patch.notes = notes === "" ? null : notes;
  if (methodType) patch.methodType = methodType;

  const rows = await db
    .update(payees)
    .set(patch)
    .where(and(eq(payees.id, Number(id)), eq(payees.userId, user.id)))
    .returning();
  if (rows.length === 0) return apiError(404, "Payee not found.");
  const p = rows[0];
  return Response.json({
    id: p.id,
    name: p.name,
    methodType: p.methodType,
    methodDetail: p.methodDetail,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to be signed in.");
  const { id } = await ctx.params;
  const rows = await db
    .delete(payees)
    .where(and(eq(payees.id, Number(id)), eq(payees.userId, user.id)))
    .returning();
  if (rows.length === 0) return apiError(404, "Payee not found.");
  return Response.json({ ok: true });
}
