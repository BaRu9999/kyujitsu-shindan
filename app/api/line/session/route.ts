import { randomBytes } from "node:crypto";
import { callSupabaseRpc, getSupabaseAdminConfig, supabaseAdminRequest } from "@/app/lib/supabase-server";
import { pushResultCoupon, verifyLineIdToken } from "@/app/lib/line-server";

type SessionAction = "opened" | "started";

type SessionPayload = {
  idToken?: string;
  action?: SessionAction;
  source?: string;
};

type StoredAnswer = {
  question?: string;
  answer?: string;
  answerIndex?: number;
};

type CampaignUser = {
  id: string;
  campaign_id: string;
  line_user_id: string;
  diagnosis_completed_at: string | null;
  diagnosis_result: "coloring" | "meal" | "sweet" | null;
  answers?: StoredAnswer[];
  participant_code: string | null;
  coupon_code: string | null;
  coupon_send_status: "not_sent" | "sent" | "failed";
  was_existing?: boolean;
};

type ColoringPass = {
  participantCode: string;
  token: string;
  passType: "advance" | "same_day";
  source: string;
  diagnosedOn: string;
  previewUsed: boolean;
  created: boolean;
};

const campaignId = () => process.env.DIAGNOSIS_CAMPAIGN_ID || "weekend-2026-08-22";
const eventStart = () => process.env.DIAGNOSIS_EVENT_START || "2026-08-22";
const cleanSource = (source?: string) => (source || "line").slice(0, 40);
const japanDayKey = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const passToken = () => randomBytes(4).toString("hex").toUpperCase();

const fetchDiagnosis = async (
  config: { url: string; key: string },
  participantCode: string,
) => {
  const response = await supabaseAdminRequest(
    config,
    `/rest/v1/diagnosis_participants?participant_code=eq.${encodeURIComponent(participantCode)}&select=*&limit=1`,
    { method: "GET" },
  );
  if (!response.ok) throw new Error("participant_read_failed");
  const rows = await response.json() as Array<Record<string, unknown>>;
  return rows[0] || null;
};

export async function POST(request: Request) {
  const config = getSupabaseAdminConfig();
  if (!config) return Response.json({ error: "supabase_not_configured" }, { status: 503 });

  let payload: SessionPayload;
  try {
    payload = await request.json() as SessionPayload;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!payload.idToken || !payload.action || !["opened", "started"].includes(payload.action)) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const lineUser = await verifyLineIdToken(payload.idToken);
    const currentCampaign = campaignId();
    const currentDay = japanDayKey();
    const requestSource = cleanSource(payload.source);
    let campaignUser = payload.action === "opened"
      ? await callSupabaseRpc<CampaignUser>(config, "register_diagnosis_campaign_open", {
        p_campaign_id: currentCampaign,
        p_line_user_id: lineUser.sub,
        p_line_display_name: lineUser.name || "",
        p_source: requestSource,
      })
      : await callSupabaseRpc<CampaignUser>(config, "mark_diagnosis_campaign_started", {
        p_campaign_id: currentCampaign,
        p_line_user_id: lineUser.sub,
      });

    if (
      payload.action === "opened" &&
      campaignUser.diagnosis_completed_at &&
      campaignUser.diagnosis_result &&
      campaignUser.coupon_code &&
      campaignUser.coupon_send_status !== "sent"
    ) {
      const delivery = await pushResultCoupon({
        lineUserId: lineUser.sub,
        result: campaignUser.diagnosis_result,
        retryKey: campaignUser.id,
        companion: campaignUser.answers?.[0]?.answer,
      });
      campaignUser = await callSupabaseRpc<CampaignUser>(config, "mark_diagnosis_coupon_delivery", {
        p_campaign_id: currentCampaign,
        p_line_user_id: lineUser.sub,
        p_sent: delivery.sent,
        p_error: delivery.error || "",
      });
    }

    let coloringPass: ColoringPass | null = null;
    if (payload.action === "opened" && requestSource === "table" && currentDay >= eventStart()) {
      const generatedToken = passToken();
      coloringPass = await callSupabaseRpc<ColoringPass>(config, "issue_table_coloring_pass", {
        p_campaign_id: currentCampaign,
        p_line_user_id: lineUser.sub,
        p_participant_code: `DAY-${generatedToken}`,
        p_token: generatedToken,
        p_source: requestSource,
        p_diagnosed_on: currentDay,
      });
    }

    let diagnosis = null;
    if (campaignUser.diagnosis_completed_at && campaignUser.participant_code) {
      const participant = await fetchDiagnosis(config, campaignUser.participant_code);
      if (participant) {
        diagnosis = {
          result: participant.diagnosis_result,
          diagnosedOn: participant.diagnosed_on,
          token: participant.token,
          source: participant.source,
          previewUsed: participant.preview_used,
          eventEligible: participant.event_eligible,
          passType: participant.pass_type,
          campaignId: campaignUser.campaign_id,
          couponCode: campaignUser.coupon_code,
          couponSent: campaignUser.coupon_send_status === "sent",
        };
      }
    }

    return Response.json({
      authenticated: true,
      campaignId: currentCampaign,
      completed: Boolean(diagnosis),
      diagnosis,
      coloringPass,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "line_session_failed";
    const status = message.includes("invalid_line") ? 401 : 502;
    return Response.json({ error: message.split(":")[0] }, { status });
  }
}
