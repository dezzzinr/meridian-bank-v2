import { getRates } from "@/lib/exchange";
import { apiError, requireUser } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to be signed in.");
  const rates = getRates(user.currency);
  return Response.json({ base: user.currency, rates, updated: new Date().toISOString() });
}
