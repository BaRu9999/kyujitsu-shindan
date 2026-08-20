type ResultKey = "coloring" | "meal" | "sweet";
type PassType = "advance" | "same_day" | null;
type EventType =
  | "diagnosis_completed"
  | "table_qr_opened"
  | "preview_started"
  | "coloring_started"
  | "artwork_submitted";

type ParticipationPayload = {
  participantCode: string;
  token: string;
  result: ResultKey;
  passType: PassType;
  source: string;
  diagnosedOn: string;
  eventEligible: boolean;
  previewUsed: boolean;
  eventType: EventType;
  metadata?: Record<string, string | number | boolean | null>;
};

const validResults = new Set<ResultKey>(["coloring", "meal", "sweet"]);
const validPassTypes = new Set<Exclude<PassType, null>>(["advance", "same_day"]);
const validEventTypes = new Set<EventType>([
  "diagnosis_completed",
  "table_qr_opened",
  "preview_started",
  "coloring_started",
  "artwork_submitted",
]);

const isValidPayload = (value: unknown): value is ParticipationPayload => {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<ParticipationPayload>;
  return Boolean(
    typeof data.participantCode === "string" &&
    /^[A-Z0-9-]{4,24}$/.test(data.participantCode) &&
    typeof data.token === "string" &&
    /^[A-Z0-9]{4,12}$/.test(data.token) &&
    data.result && validResults.has(data.result) &&
    (data.passType === null || (data.passType && validPassTypes.has(data.passType))) &&
    typeof data.source === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.diagnosedOn || "") &&
    typeof data.eventEligible === "boolean" &&
    typeof data.previewUsed === "boolean" &&
    data.eventType && validEventTypes.has(data.eventType)
  );
};

const supabaseRequest = async (
  supabaseUrl: string,
  path: string,
  key: string,
  init: RequestInit,
) => fetch(`${supabaseUrl}${path}`, {
  ...init,
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...init.headers,
  },
});

export async function POST(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { stored: false, configured: false },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ stored: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isValidPayload(payload)) {
    return Response.json({ stored: false, error: "invalid_payload" }, { status: 400 });
  }

  const participantResponse = await supabaseRequest(
    supabaseUrl,
    "/rest/v1/diagnosis_participants?on_conflict=participant_code",
    serviceRoleKey,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        participant_code: payload.participantCode,
        token: payload.token,
        diagnosis_result: payload.result,
        pass_type: payload.passType,
        source: payload.source.slice(0, 40),
        diagnosed_on: payload.diagnosedOn,
        event_eligible: payload.eventEligible,
        preview_used: payload.previewUsed,
        updated_at: new Date().toISOString(),
      }),
    },
  );

  if (!participantResponse.ok) {
    return Response.json({ stored: false, error: "participant_write_failed" }, { status: 502 });
  }

  const eventResponse = await supabaseRequest(
    supabaseUrl,
    "/rest/v1/participation_events",
    serviceRoleKey,
    {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        participant_code: payload.participantCode,
        event_type: payload.eventType,
        source: payload.source.slice(0, 40),
        metadata: payload.metadata || {},
      }),
    },
  );

  if (!eventResponse.ok) {
    return Response.json({ stored: false, error: "event_write_failed" }, { status: 502 });
  }

  return Response.json({ stored: true });
}
