import { readBody } from "@/lib/api";
import { bankingUser, bankingError, positiveId, privateHeaders } from "@/lib/banking-server";
import { updateCard } from "@/lib/cards";
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await bankingUser(true);
    return Response.json(await updateCard(user, positiveId((await ctx.params).id), await readBody(req)), { headers: privateHeaders });
  } catch (error) { return bankingError(error, "cards:update"); }
}
