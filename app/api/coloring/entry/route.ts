import { createColoringEntryToken, type ColoringEntryMode } from "@/app/lib/coloring-entry";
import { verifyLineIdToken } from "@/app/lib/line-server";
import { getSupabaseAdminConfig, supabaseAdminRequest } from "@/app/lib/supabase-server";
import { findLegacyTableColoringPass } from "@/app/lib/table-coloring-pass";

type EntryPayload = {
  idToken?: string;
  mode?: ColoringEntryMode;
  source?: string;
  coloring?: string;
};

type StoredAnswer = {
  question?: string;
  answer?: string;
  answerIndex?: number;
};

type CampaignUser = {
  diagnosis_result: "coloring" | "meal" | "sweet" | null;
  answers?: StoredAnswer[];
  participant_code: string | null;
  coloring_participant_code: string | null;
  coloring_pass_type: "advance" | "same_day" | null;
};

type Participant = {
  participant_code: string;
  pass_type: "advance" | "same_day" | null;
  event_eligible: boolean;
  preview_used: boolean;
};

const campaignId = () => process.env.DIAGNOSIS_CAMPAIGN_ID || "weekend-2026-08-22";
const eventStart = () => process.env.DIAGNOSIS_EVENT_START || "2026-08-22";
const japanDayKey = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const fetchOne = async <T>(response: Response, error: string) => {
  if (!response.ok) throw new Error(error);
  const rows = await response.json() as T[];
  return rows[0] || null;
};

const fetchCampaignUser = async (
  config: { url: string; key: string },
  currentCampaign: string,
  lineUserId: string,
) => {
  const queryBase = `/rest/v1/diagnosis_campaign_users?campaign_id=eq.${encodeURIComponent(currentCampaign)}&line_user_id=eq.${encodeURIComponent(lineUserId)}`;
  const currentResponse = await supabaseAdminRequest(
    config,
    `${queryBase}&select=diagnosis_result,answers,participant_code,coloring_participant_code,coloring_pass_type&limit=1`,
    { method: "GET" },
  );
  if (currentResponse.ok) {
    return fetchOne<CampaignUser>(currentResponse, "campaign_user_read_failed");
  }

  const legacy = await fetchOne<Pick<CampaignUser, "diagnosis_result" | "answers" | "participant_code">>(
    await supabaseAdminRequest(
      config,
      `${queryBase}&select=diagnosis_result,answers,participant_code&limit=1`,
      { method: "GET" },
    ),
    "campaign_user_read_failed",
  );
  if (!legacy) return null;
  return {
    ...legacy,
    coloring_participant_code: legacy.diagnosis_result === "coloring" ? legacy.participant_code : null,
    coloring_pass_type: null,
  } satisfies CampaignUser;
};

export async function POST(request: Request) {
  const config = getSupabaseAdminConfig();
  const galleryUrl = process.env.COLORING_GALLERY_URL;
  const entrySecret = process.env.COLORING_ENTRY_SECRET;
  if (!config || !galleryUrl || !entrySecret || entrySecret.length < 32) {
    return Response.json({ error: "coloring_entry_not_configured" }, { status: 503 });
  }

  let payload: EntryPayload;
  try {
    payload = await request.json() as EntryPayload;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!payload.idToken || !payload.mode || !["trial", "event"].includes(payload.mode)) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const lineUser = await verifyLineIdToken(payload.idToken);
    const currentCampaign = campaignId();
    const currentDay = japanDayKey();
    const campaignUser = await fetchCampaignUser(config, currentCampaign, lineUser.sub);
    let participantCode = payload.mode === "trial"
      ? (campaignUser?.diagnosis_result === "coloring" ? campaignUser.participant_code : null)
      : campaignUser?.coloring_participant_code;

    // If migration 003 is not installed, the campaign table has no coloring pass columns.
    // Reuse the deterministic same-day pass created by the session fallback instead.
    if (
      payload.mode === "event" &&
      !participantCode &&
      payload.source === "table" &&
      currentDay >= eventStart()
    ) {
      const legacyPass = await findLegacyTableColoringPass(
        config,
        currentCampaign,
        lineUser.sub,
        currentDay,
      );
      participantCode = legacyPass?.participantCode || null;
    }

    if (!participantCode) {
      return Response.json({ error: "coloring_pass_not_found" }, { status: 403 });
    }

    const participant = await fetchOne<Participant>(
      await supabaseAdminRequest(
        config,
        `/rest/v1/diagnosis_participants?participant_code=eq.${encodeURIComponent(participantCode)}&select=participant_code,pass_type,event_eligible,preview_used&limit=1`,
        { method: "GET" },
      ),
      "participant_read_failed",
    );
    if (!participant?.event_eligible || !participant.pass_type) {
      return Response.json({ error: "coloring_pass_not_eligible" }, { status: 403 });
    }

    if (payload.mode === "trial") {
      if (currentDay >= eventStart() || participant.pass_type !== "advance") {
        return Response.json({ error: "trial_period_ended" }, { status: 403 });
      }
      const consumeResponse = await supabaseAdminRequest(
        config,
        `/rest/v1/diagnosis_participants?participant_code=eq.${encodeURIComponent(participant.participant_code)}&preview_used=eq.false`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ preview_used: true, updated_at: new Date().toISOString() }),
        },
      );
      const consumed = consumeResponse.ok ? await consumeResponse.json() as Participant[] : [];
      if (!consumeResponse.ok) throw new Error("trial_consume_failed");
      if (!consumed.length) return Response.json({ error: "trial_already_used" }, { status: 409 });
    } else {
      if (currentDay < eventStart()) {
        return Response.json({ error: "event_not_started" }, { status: 403 });
      }
      if (payload.source !== "table") {
        return Response.json({ error: "table_qr_required" }, { status: 403 });
      }
    }

    const palette = payload.mode === "event" && participant.pass_type === "advance"
      ? "advance"
      : "standard";
    const coloring = String(payload.coloring || "季節のぬりえ").trim().slice(0, 40);
    const eventType = payload.mode === "trial" ? "preview_started" : "coloring_started";
    const eventResponse = await supabaseAdminRequest(config, "/rest/v1/participation_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        participant_code: participant.participant_code,
        event_type: eventType,
        source: String(payload.source || "line").slice(0, 40),
        metadata: { coloring, palette, entry: "signed_gallery" },
      }),
    });
    if (!eventResponse.ok) throw new Error("entry_event_write_failed");

    const entryToken = createColoringEntryToken({
      campaignId: currentCampaign,
      participantCode: participant.participant_code,
      mode: payload.mode,
      passType: participant.pass_type,
      palette,
      coloring,
      companion: campaignUser?.answers?.[0]?.answer,
    }, entrySecret);
    const target = payload.mode === "trial"
      ? new URL("/trial", request.url)
      : new URL(galleryUrl);
    target.searchParams.set("entry", entryToken);

    return Response.json({
      entryUrl: target.toString(),
      mode: payload.mode,
      passType: participant.pass_type,
      palette,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "coloring_entry_failed";
    const status = message.includes("invalid_line") ? 401 : 502;
    return Response.json({ error: message.split(":")[0] }, { status });
  }
}
