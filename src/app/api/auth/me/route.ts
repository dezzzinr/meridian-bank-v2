import { apiError, requireUser } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (!user) return apiError(401, "You need to be signed in.");
  return Response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    currency: user.currency,
    region: user.region,
    avatarUrl: user.avatarUrl ?? null,
    accountLocked: user.accountLocked ?? false,
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    biometricsEnabled: user.biometricsEnabled ?? false,
    hasTransactionPin: user.hasTransactionPin ?? false,
    hasSecurityQuestion: user.hasSecurityQuestion ?? false,
    createdAt: user.createdAt.toISOString(),
  });
}
