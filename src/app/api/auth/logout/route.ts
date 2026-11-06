import { clearSessionCookie, destroySession, getSessionToken } from "@/lib/auth";

export async function POST() {
  const token = await getSessionToken();
  if (token) {
    try {
      await destroySession(token);
    } catch {
      // best effort
    }
  }
  await clearSessionCookie();
  return Response.json({ ok: true });
}
