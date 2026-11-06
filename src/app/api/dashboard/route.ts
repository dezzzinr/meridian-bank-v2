import { apiError, requireUser } from "@/lib/api";
import { dashboard } from "@/lib/queries";

export async function GET() {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to be signed in.");
  return Response.json(await dashboard(user.id));
}
