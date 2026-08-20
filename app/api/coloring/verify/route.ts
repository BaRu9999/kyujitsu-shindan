import { verifyColoringEntryToken } from "@/app/lib/coloring-entry";

export async function POST(request: Request) {
  const secret = process.env.COLORING_ENTRY_SECRET;
  if (!secret || secret.length < 32) {
    return Response.json({ error: "coloring_entry_not_configured" }, { status: 503 });
  }

  try {
    const body = await request.json() as { token?: string };
    if (!body.token) {
      return Response.json({ error: "missing_token" }, { status: 400 });
    }
    const claims = verifyColoringEntryToken(body.token, secret);
    if (claims.mode !== "trial") {
      return Response.json({ error: "trial_only" }, { status: 403 });
    }
    return Response.json({
      ok: true,
      entry: {
        entryId: claims.entryId,
        participantCode: claims.participantCode,
        passType: claims.passType,
        palette: claims.palette,
        coloring: claims.coloring,
        companion: claims.companion,
        expiresAt: claims.expiresAt,
      },
    });
  } catch {
    return Response.json({ error: "invalid_or_expired_entry" }, { status: 401 });
  }
}
