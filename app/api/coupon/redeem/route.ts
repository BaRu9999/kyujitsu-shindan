import { timingSafeEqual } from "node:crypto";
import { callSupabaseRpc, getSupabaseAdminConfig } from "@/app/lib/supabase-server";

type RedeemPayload = { couponCode?: string; pin?: string };

const secretsMatch = (provided: string, expected: string) => {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
};

export async function POST(request: Request) {
  const config = getSupabaseAdminConfig();
  const expectedPin = process.env.COUPON_STAFF_PIN;
  if (!config || !expectedPin) return Response.json({ error: "redemption_not_configured" }, { status: 503 });

  let payload: RedeemPayload;
  try {
    payload = await request.json() as RedeemPayload;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const code = (payload.couponCode || "").trim().toUpperCase();
  if (!/^(NURIE|GOZEN|WARABI)-[A-F0-9]{6}$/.test(code) || !payload.pin) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }
  if (!secretsMatch(payload.pin, expectedPin)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const coupon = await callSupabaseRpc<Record<string, unknown>>(config, "redeem_diagnosis_coupon", {
      p_coupon_code: code,
    });
    return Response.json({
      redeemed: true,
      alreadyRedeemed: Boolean(coupon.was_redeemed),
      couponCode: coupon.coupon_code,
      couponType: coupon.coupon_type,
      result: coupon.diagnosis_result,
      redeemedAt: coupon.coupon_redeemed_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "redeem_failed";
    const status = message.includes("coupon_not_found") ? 404 : 502;
    return Response.json({ error: status === 404 ? "coupon_not_found" : "redeem_failed" }, { status });
  }
}
