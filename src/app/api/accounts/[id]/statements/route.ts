import { HttpError } from "@/lib/api";
import { bankingUser, bankingError, positiveId, privateHeaders } from "@/lib/banking-server";
import { getStatement, statementCSV, statementPDF } from "@/lib/statements";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await bankingUser();
    const id = positiveId((await ctx.params).id);
    const search = new URL(req.url).searchParams;
    const format = search.get("format") ?? "json";
    if (!["json", "csv", "pdf"].includes(format)) throw new HttpError(400, "Choose PDF or CSV.");
    const statement = await getStatement(user.id, id, search.get("from"), search.get("to"));
    if (format === "json") return Response.json(statement, { headers: privateHeaders });
    const filename = `meridian-account-${id}-${statement.from}-${statement.to}.${format}`;
    const headers = { ...privateHeaders, "Content-Disposition": `attachment; filename="${filename}"`, "X-Content-Type-Options": "nosniff", "Content-Type": format === "pdf" ? "application/pdf" : "text/csv; charset=utf-8" };
    if (format === "csv") return new Response(statementCSV(statement), { headers });
    const bytes = await statementPDF(statement);
    return new Response(new Uint8Array(bytes), { headers });
  } catch (error) { return bankingError(error, "statements:export"); }
}
