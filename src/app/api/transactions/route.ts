import { apiError, requireUser } from "@/lib/api";
import { listAccounts, listTransactions, settleAgedPending } from "@/lib/queries";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to be signed in.");

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 300) || 300, 500);

  await settleAgedPending();
  const [accounts, transactions] = await Promise.all([
    listAccounts(user.id),
    listTransactions(user.id, limit),
  ]);

  return Response.json({ transactions, accounts });
}
