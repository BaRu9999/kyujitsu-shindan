import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type ColoringEntryMode = "trial" | "event";
export type ColoringPalette = "standard" | "advance";

export type ColoringEntryClaims = {
  version: 1;
  campaignId: string;
  participantCode: string;
  mode: ColoringEntryMode;
  passType: "advance" | "same_day";
  palette: ColoringPalette;
  coloring: string;
  companion?: string;
  issuedAt: number;
  expiresAt: number;
  entryId: string;
};

const encode = (value: string | Buffer) => Buffer.from(value).toString("base64url");

const signatureFor = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

export const createColoringEntryToken = (
  values: Omit<ColoringEntryClaims, "version" | "issuedAt" | "expiresAt" | "entryId">,
  secret: string,
) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  // Trial links stay intentionally short-lived. Event links last through a full
  // day so a guest who opened the table QR earlier does not lose access midway
  // through the visit or when LINE reopens the external LIFF destination later.
  const lifetime = values.mode === "trial" ? 30 * 60 : 24 * 60 * 60;
  const claims: ColoringEntryClaims = {
    version: 1,
    ...values,
    issuedAt,
    expiresAt: issuedAt + lifetime,
    entryId: randomBytes(8).toString("hex"),
  };
  const payload = encode(JSON.stringify(claims));
  return `${payload}.${signatureFor(payload, secret)}`;
};

export const verifyColoringEntryToken = (token: string, secret: string) => {
  const [payload, provided] = token.split(".");
  if (!payload || !provided) throw new Error("invalid_entry_token");
  const expected = signatureFor(payload, secret);
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) throw new Error("invalid_entry_signature");

  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ColoringEntryClaims;
  const now = Math.floor(Date.now() / 1000);
  if (
    claims.version !== 1 ||
    !["trial", "event"].includes(claims.mode) ||
    !["advance", "same_day"].includes(claims.passType) ||
    !["standard", "advance"].includes(claims.palette) ||
    claims.expiresAt <= now ||
    claims.issuedAt > now + 60
  ) throw new Error("expired_or_invalid_entry");
  return claims;
};
