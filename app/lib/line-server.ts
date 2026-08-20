import type { ResultKey } from "./diagnosis";

type VerifiedLineUser = {
  sub: string;
  name?: string;
  picture?: string;
};

export const verifyLineIdToken = async (idToken: string): Promise<VerifiedLineUser> => {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) throw new Error("line_login_not_configured");

  const body = new URLSearchParams({ id_token: idToken, client_id: channelId });
  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) throw new Error("invalid_line_id_token");
  const profile = await response.json() as Partial<VerifiedLineUser>;
  if (!profile.sub || !/^U[0-9a-f]{32}$/i.test(profile.sub)) {
    throw new Error("invalid_line_user");
  }
  return profile as VerifiedLineUser;
};

const couponCopy: Record<ResultKey, { title: string; benefit: string; description: string }> = {
  coloring: {
    title: "季節のぬりえ参加PASS",
    benefit: "参加無料",
    description: "店内の卓上QRから、季節のぬりえを始められます。",
  },
  meal: {
    title: "選べる御膳＋和紅茶",
    benefit: "120円OFF",
    description: "お好きな御膳と和紅茶を一緒にご注文ください。",
  },
  sweet: {
    title: "二色わらび餅＋和紅茶",
    benefit: "120円OFF",
    description: "二色わらび餅と和紅茶を一緒にご注文ください。",
  },
};

export const pushResultCoupon = async ({
  lineUserId,
  result,
  couponCode,
  retryKey,
}: {
  lineUserId: string;
  result: ResultKey;
  couponCode: string;
  retryKey: string;
}) => {
  const accessToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) return { sent: false, error: "line_messaging_not_configured" };

  const copy = couponCopy[result];
  const appUrl = process.env.NEXT_PUBLIC_LIFF_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://kyujitsu-shindan.vercel.app/?source=line";

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Line-Retry-Key": retryKey,
    },
    body: JSON.stringify({
      to: lineUserId,
      customAggregationUnits: [`holiday_${result}`],
      messages: [{
        type: "flex",
        altText: `休日診断の結果：${copy.title} ${copy.benefit}`,
        contents: {
          type: "bubble",
          styles: {
            header: { backgroundColor: "#195D48" },
            footer: { separator: true },
          },
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "土・日限定｜休日診断", color: "#FFFFFF", size: "sm", weight: "bold" },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: [
              { type: "text", text: copy.title, weight: "bold", size: "xl", wrap: true, color: "#2C2119" },
              { type: "text", text: copy.benefit, weight: "bold", size: "xxl", color: result === "sweet" ? "#B77B00" : "#D94B32" },
              { type: "text", text: copy.description, size: "sm", color: "#625646", wrap: true },
              { type: "separator", margin: "md" },
              { type: "text", text: `クーポン番号  ${couponCode}`, size: "sm", weight: "bold", color: "#2C2119" },
              { type: "text", text: "土日・当日限り・1人1回まで", size: "xs", color: "#75695B" },
            ],
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [{
              type: "button",
              style: "primary",
              color: "#195D48",
              action: { type: "uri", label: "診断結果を確認", uri: appUrl },
            }],
          },
        },
      }],
    }),
    cache: "no-store",
  });

  if (response.ok || response.status === 409) return { sent: true, error: null };
  const detail = await response.text();
  return { sent: false, error: `line_push_failed:${response.status}:${detail.slice(0, 200)}` };
};
