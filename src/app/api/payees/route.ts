import { db } from "@/db";
import { payees } from "@/db/schema";
import { apiError, readBody, requireUser, str } from "@/lib/api";
import { listPayees } from "@/lib/queries";

export async function GET() {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to be signed in.");
  const payeesList = await listPayees(user.id);
  return Response.json({ payees: payeesList });
}

const METHOD_TYPES = ["bank", "email", "mobile"] as const;

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to be signed in.");

  const body = await readBody(req);
  const name = str(body.name, 1, 60);
  const methodType = (METHOD_TYPES as readonly string[]).includes(
    String(body.methodType ?? "bank"),
  )
    ? (body.methodType as "bank" | "email" | "mobile")
    : "bank";
  const methodDetail = str(body.methodDetail, 1, 80);
  const notesRaw = body.notes === undefined || body.notes === null ? null : str(body.notes, 0, 140);
  if (notesRaw === null && body.notes !== undefined && body.notes !== null && body.notes !== "") {
    return apiError(400, "Notes must be 1-140 characters.");
  }

  if (!name) return apiError(400, "Payee name is required.");
  if (!methodDetail) {
    return apiError(400, "Add the bank, email, or number to pay.");
  }

  const rows = await db
    .insert(payees)
    .values({
      userId: user.id,
      name,
      methodType,
      methodDetail,
      notes: notesRaw === null && (body.notes === "" ) ? null : notesRaw,
    })
    .returning();
  const p = rows[0];
  return Response.json(
    {
      id: p.id,
      name: p.name,
      methodType: p.methodType,
      methodDetail: p.methodDetail,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
