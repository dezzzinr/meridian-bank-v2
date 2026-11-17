import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

type EmailMessage = { to: string; subject: string; title: string; message: string; idempotencyKey?: string };
let missingConfigReported = false;

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (char) => entities[char]!);
}

export async function sendEmailNotification({ to, subject, title, message, idempotencyKey }: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    if (!missingConfigReported) {
      console.error("Resend email skipped: RESEND_API_KEY and RESEND_FROM_EMAIL must be set in the server environment.");
      missingConfigReported = true;
    }
    return false;
  }

  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  let appUrl = "";
  try {
    const configuredUrl = process.env.APP_URL;
    if (configuredUrl) {
      const parsed = new URL(configuredUrl);
      if (parsed.protocol === "https:" || (parsed.protocol === "http:" && parsed.hostname === "localhost")) appUrl = parsed.toString().replace(/\/$/, "");
    }
  } catch { /* An invalid app URL simply omits the dashboard link. */ }
  const dashboard = appUrl ? `<p style="margin:28px 0 0"><a href="${escapeHtml(appUrl)}/app" style="display:inline-block;background:#147d53;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">Open Meridian</a></p>` : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#17231d"><div style="max-width:560px;margin:32px auto;padding:32px 28px;background:#fff;border:1px solid #e3eae5;border-radius:16px"><p style="margin:0 0 24px;color:#147d53;font-weight:700;letter-spacing:.08em">MERIDIAN</p><h1 style="font-size:22px;line-height:1.3;margin:0 0 12px">${safeTitle}</h1><p style="font-size:15px;line-height:1.65;margin:0;color:#4d5b53">${safeMessage}</p>${dashboard}<p style="border-top:1px solid #e8eee9;margin:28px 0 0;padding-top:16px;color:#758078;font-size:12px;line-height:1.5">This is an automated account notification. Meridian support will never ask you to share your password or verification code by email or live chat.</p></div></body></html>`;
  const text = `${title}\n\n${message}${appUrl ? `\n\nOpen Meridian: ${appUrl}/app` : ""}\n\nThis is an automated account notification. Meridian support will never ask you to share your password or verification code by email or live chat.`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    const result = await response.json().catch(() => null) as { id?: unknown; name?: unknown; message?: unknown } | null;
    if (!response.ok) {
      console.error("Resend email delivery failed", {
        status: response.status,
        error: typeof result?.name === "string" ? result.name.slice(0, 80) : "provider_error",
        message: typeof result?.message === "string" ? result.message.replace(/[\r\n]/g, " ").slice(0, 180) : undefined,
      });
      return false;
    }
    if (typeof result?.id === "string") console.info("Resend accepted notification email", { id: result.id });
    return true;
  } catch (error) {
    console.error("Resend email delivery failed", error instanceof Error ? error.name : "unknown error");
    return false;
  }
}

export async function emailUserNotification(userId: number, title: string, message: string, idempotencyKey?: string): Promise<boolean> {
  try {
    const [user] = await db.select({ email: users.email, emailNotificationsEnabled: users.emailNotificationsEnabled }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.email || !user.emailNotificationsEnabled) return false;
    return sendEmailNotification({ to: user.email, subject: title, title, message, idempotencyKey });
  } catch (error) {
    console.error("Could not prepare account email notification", error instanceof Error ? error.name : "unknown error");
    return false;
  }
}
