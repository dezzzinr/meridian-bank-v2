import { bankingUser, bankingError, positiveId, privateHeaders } from "@/lib/banking-server";
import { cancelTransfer } from "@/lib/cancel-transfer";
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await bankingUser(true);
    return Response.json(await cancelTransfer(user.id, positiveId((await ctx.params).id)), { headers: privateHeaders });
  } catch (error) { return bankingError(error, "transfers:cancel"); }
}
