import { randomBytes } from "node:crypto";
import { calculateDiagnosis, couponTypeForResult, type ResultKey } from "@/app/lib/diagnosis";
import { pushResultCoupon, verifyLineIdToken } from "@/app/lib/line-server";
import { callSupabaseRpc, getSupabaseAdminConfig } from "@/app/lib/supabase-server";

type DiagnosisPayload = {
  idToken?: string;
  answerIndexes?: number[];
  source?: string;
};

type CampaignUser = {
  id: string;
  campaign_id: string;
  line_user_id: string;
  diagnosed_on: string;
  diagnosis_result: ResultKey;
  participant_code: string;
  coupon_code: string;
  coupon_type: string;
  coupon_send_status: "not_sent" | "sent" | "failed";
  coupon_sent_at: string | null;
  was_existing: boolean;
};

const japanDayKey = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const campaignId = () => process.env.DIAGNOSIS_CAMPAIGN_ID || "weekend-2026-08-22";
const eventStart = () => process.env.DIAGNOSIS_EVENT_START || "2026-08-22";
const token = () => randomBytes(3).toString("hex").toUpperCase();

const couponPrefix: Record<ResultKey, string> = {
  coloring: "NURIE",
  meal: "GOZEN",
  sweet: "WARABI",
};

export async function POST(request: Request) {
  const config = getSupabaseAdminConfig();
  if (!config) return Response.json({ error: "supabase_not_configured" }, { status: 503 });

  let payload: DiagnosisPayload;
  try {
    payload = await request.json() as DiagnosisPayload;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!payload.idToken || !Array.isArray(payload.answerIndexes)) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const lineUser = await verifyLineIdToken(payload.idToken);
    const diagnosis = calculateDiagnosis(payload.answerIndexes);
    const currentDay = japanDayKey();
    const currentCampaign = campaignId();
    const rawToken = token();
    const passType = diagnosis.result === "coloring"
      ? (currentDay < eventStart() ? "advance" : "same_day")
      : "";
    const participantCode = diagnosis.result === "coloring"
      ? `${passType === "advance" ? "PRE" : "DAY"}-${rawToken}`
      : rawToken;
    const couponCode = `${couponPrefix[diagnosis.result]}-${token()}`;

    let campaignUser = await callSupabaseRpc<CampaignUser>(config, "complete_diagnosis_campaign", {
      p_campaign_id: currentCampaign,
      p_line_user_id: lineUser.sub,
      p_result: diagnosis.result,
      p_answers: diagnosis.answers,
      p_participant_code: participantCode,
      p_token: rawToken,
      p_pass_type: passType,
      p_source: (payload.source || "line").slice(0, 40),
      p_diagnosed_on: currentDay,
      p_event_eligible: diagnosis.result === "coloring",
      p_coupon_code: couponCode,
      p_coupon_type: couponTypeForResult[diagnosis.result],
    });

    const wasExisting = campaignUser.was_existing;
    if (campaignUser.coupon_send_status !== "sent") {
      const delivery = await pushResultCoupon({
        lineUserId: lineUser.sub,
        result: campaignUser.diagnosis_result,
        retryKey: campaignUser.id,
      });
      campaignUser = await callSupabaseRpc<CampaignUser>(config, "mark_diagnosis_coupon_delivery", {
        p_campaign_id: currentCampaign,
        p_line_user_id: lineUser.sub,
        p_sent: delivery.sent,
        p_error: delivery.error || "",
      });
    }

    const storedResult = campaignUser.diagnosis_result;
    const storedToken = campaignUser.participant_code.replace(/^(PRE|DAY)-/, "");
    const storedPassType = storedResult === "coloring"
      ? (campaignUser.participant_code.startsWith("PRE-") ? "advance" : "same_day")
      : null;

    return Response.json({
      completed: true,
      existing: wasExisting,
      diagnosis: {
        result: storedResult,
        diagnosedOn: campaignUser.diagnosed_on,
        token: storedToken,
        source: (payload.source || "line").slice(0, 40),
        previewUsed: false,
        eventEligible: storedResult === "coloring",
        passType: storedPassType,
        campaignId: currentCampaign,
        couponCode: campaignUser.coupon_code,
        couponSent: campaignUser.coupon_send_status === "sent",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "diagnosis_failed";
    const status = message.startsWith("invalid_answer") ? 400 :
      message.includes("invalid_line") ? 401 : 502;
    return Response.json({ error: message.split(":")[0] }, { status });
  }
}
