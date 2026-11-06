import { HttpError, readBody } from "@/lib/api";
import { bankingUser, bankingError, positiveId, privateHeaders } from "@/lib/banking-server";
import { cardAction, listCardActivity, simulateCardPayment } from "@/lib/cards";
type Ctx = { params: Promise<{ id: string; action: string }> };
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await bankingUser();
    const { id, action } = await ctx.params;
    if (action !== "activity") throw new HttpError(404, "Unknown card resource.");
    return Response.json({ activity: await listCardActivity(user.id, positiveId(id)) }, { headers: privateHeaders });
  } catch (error) { return bankingError(error, "cards:activity"); }
}
export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await bankingUser(true);
    const { id, action } = await ctx.params;
    const body = await readBody(req);
    const result = action === "simulate"
      ? await simulateCardPayment(user, positiveId(id), body)
      : await cardAction(user, positiveId(id), action, body);
    if ("error" in result && result.error) return Response.json({ error: result.error }, { status: 403, headers: privateHeaders });
    return Response.json(result, { headers: privateHeaders });
  } catch (error) { return bankingError(error, "cards:action"); }
}
