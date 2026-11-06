import { db } from "@/db";
import { notifications } from "@/db/schema";

type NotifType =
  | "transfer"
  | "payment"
  | "account"
  | "security"
  | "admin_message"
  | "system";

interface NotifInput {
  userId: number;
  type: NotifType;
  title: string;
  body: string;
  createdBy?: number | null;
}

/**
 * Log a notification for a user. Best-effort: never throws into the
 * caller's request flow (a logging failure shouldn't fail a transfer).
 */
export async function logNotification(input: NotifInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      createdBy: input.createdBy ?? null,
    });
  } catch (e) {
    console.error("Failed to log notification:", e);
  }
}
