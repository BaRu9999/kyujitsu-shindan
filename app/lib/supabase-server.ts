export const getSupabaseAdminConfig = () => {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
};

export const supabaseAdminRequest = (
  config: { url: string; key: string },
  path: string,
  init: RequestInit,
) => fetch(`${config.url}${path}`, {
  ...init,
  headers: {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    "Content-Type": "application/json",
    ...init.headers,
  },
  cache: "no-store",
});

export const callSupabaseRpc = async <T>(
  config: { url: string; key: string },
  functionName: string,
  body: Record<string, unknown>,
) => {
  const response = await supabaseAdminRequest(config, `/rest/v1/rpc/${functionName}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`supabase_rpc_failed:${functionName}:${response.status}:${detail.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
};
