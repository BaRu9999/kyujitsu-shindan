import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

const tokensMatch = (provided: string, expected: string) => {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);
};

export async function GET(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const expectedToken = process.env.SHEETS_SYNC_TOKEN;

  if (!supabaseUrl || !supabaseKey || !expectedToken) {
    return Response.json(
      { error: "sync_not_configured" },
      { status: 503 },
    );
  }

  const providedToken = request.headers.get("x-sync-token") || "";
  if (!tokensMatch(providedToken, expectedToken)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/sheet_participation_export?select=*&order=created_at.desc&limit=5000`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return Response.json(
      { error: "supabase_read_failed" },
      { status: 502 },
    );
  }

  const records: unknown = await response.json();
  return Response.json(records, {
    headers: { "Cache-Control": "no-store" },
  });
}
