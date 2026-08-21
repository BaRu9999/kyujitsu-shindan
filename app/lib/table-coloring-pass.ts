import { createHmac } from "node:crypto";
import { supabaseAdminRequest } from "@/app/lib/supabase-server";

type SupabaseConfig = { url: string; key: string };

export type TableColoringPass = {
  participantCode: string;
  token: string;
  passType: "same_day";
  source: string;
  diagnosedOn: string;
  previewUsed: boolean;
  created: boolean;
};

type ParticipantRow = {
  participant_code: string;
  token: string;
  diagnosis_result: "coloring" | "meal" | "sweet";
  pass_type: "advance" | "same_day" | null;
  source: string;
  diagnosed_on: string;
  event_eligible: boolean;
  preview_used: boolean;
};

const tablePassIdentity = (
  config: SupabaseConfig,
  campaignId: string,
  lineUserId: string,
  diagnosedOn: string,
) => {
  const digest = createHmac("sha256", config.key)
    .update(`${campaignId}\u0000${lineUserId}\u0000${diagnosedOn}\u0000table-coloring-pass`)
    .digest("hex")
    .toUpperCase();

  return {
    participantCode: `DAY-${digest.slice(0, 16)}`,
    token: digest.slice(16, 32),
  };
};

const toPass = (row: ParticipantRow, created: boolean): TableColoringPass => ({
  participantCode: row.participant_code,
  token: row.token,
  passType: "same_day",
  source: row.source,
  diagnosedOn: row.diagnosed_on,
  previewUsed: row.preview_used,
  created,
});

export const findLegacyTableColoringPass = async (
  config: SupabaseConfig,
  campaignId: string,
  lineUserId: string,
  diagnosedOn: string,
) => {
  const identity = tablePassIdentity(config, campaignId, lineUserId, diagnosedOn);
  const response = await supabaseAdminRequest(
    config,
    `/rest/v1/diagnosis_participants?participant_code=eq.${encodeURIComponent(identity.participantCode)}&select=participant_code,token,diagnosis_result,pass_type,source,diagnosed_on,event_eligible,preview_used&limit=1`,
    { method: "GET" },
  );
  if (!response.ok) throw new Error("legacy_table_pass_read_failed");
  const rows = await response.json() as ParticipantRow[];
  const row = rows[0];
  if (!row || row.diagnosis_result !== "coloring" || row.pass_type !== "same_day" || !row.event_eligible) {
    return null;
  }
  return toPass(row, false);
};

export const issueLegacyTableColoringPass = async (
  config: SupabaseConfig,
  campaignId: string,
  lineUserId: string,
  source: string,
  diagnosedOn: string,
) => {
  const existing = await findLegacyTableColoringPass(config, campaignId, lineUserId, diagnosedOn);
  if (existing) return existing;

  const identity = tablePassIdentity(config, campaignId, lineUserId, diagnosedOn);
  const insertResponse = await supabaseAdminRequest(config, "/rest/v1/diagnosis_participants", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      participant_code: identity.participantCode,
      token: identity.token,
      diagnosis_result: "coloring",
      pass_type: "same_day",
      source: String(source || "table").slice(0, 40),
      diagnosed_on: diagnosedOn,
      event_eligible: true,
      preview_used: false,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!insertResponse.ok) {
    if (insertResponse.status === 409) {
      const raced = await findLegacyTableColoringPass(config, campaignId, lineUserId, diagnosedOn);
      if (raced) return raced;
    }
    const detail = await insertResponse.text();
    throw new Error(`legacy_table_pass_write_failed:${insertResponse.status}:${detail.slice(0, 200)}`);
  }

  const rows = await insertResponse.json() as ParticipantRow[];
  const row = rows[0];
  if (!row) throw new Error("legacy_table_pass_write_failed");

  await supabaseAdminRequest(config, "/rest/v1/participation_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      participant_code: row.participant_code,
      event_type: "table_qr_opened",
      source: String(source || "table").slice(0, 40),
      metadata: { campaign_id: campaignId, pass_issued: true, pass_type: "same_day", fallback: "legacy_table_pass" },
    }),
  }).catch(() => null);

  return toPass(row, true);
};
