import { readBody } from "@/lib/api";
import { bankingUser, bankingError, privateHeaders } from "@/lib/banking-server";
import { issueCard, listCards } from "@/lib/cards";
export async function GET() {
  try {
    const user = await bankingUser();
    return Response.json({ cards: await listCards(user.id), demo: true }, { headers: privateHeaders });
  } catch (error) { return bankingError(error, "cards:list"); }
}
export async function POST(req: Request) {
  try {
    const user = await bankingUser(true);
    const card = await issueCard(user, await readBody(req));
    return Response.json({ id: card.id, demo: true }, { status: 201, headers: privateHeaders });
  } catch (error) { return bankingError(error, "cards:issue"); }
}
