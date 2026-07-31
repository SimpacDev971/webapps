import "server-only";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name} (DocuWare integration).`,
    );
  }
  return value;
}

let cachedToken: { token: string; generatedAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() - cachedToken.generatedAt < 50 * 60 * 1000) {
    return cachedToken.token;
  }

  const platformUrl = requireEnv("DW_PLATFORM_URL");
  const username = requireEnv("DW_USERNAME");
  const password = requireEnv("DW_PASSWORD");

  const idRes = await fetch(
    `${platformUrl}/DocuWare/Platform/Home/IdentityServiceInfo`,
    { headers: { accept: "application/json" } },
  );
  const { IdentityServiceUrl } = await idRes.json();

  const configRes = await fetch(
    `${IdentityServiceUrl}/.well-known/openid-configuration`,
  );
  const { token_endpoint } = await configRes.json();

  const body = new URLSearchParams({
    grant_type: "password",
    scope: "docuware.platform",
    client_id: "docuware.platform.net.client",
    username,
    password,
  });

  const tokenRes = await fetch(token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => "");
    console.error("[docuware] token request failed", tokenRes.status, detail);
    throw new Error(`Auth failed: ${tokenRes.status}`);
  }
  const data = await tokenRes.json();

  cachedToken = { token: data.access_token, generatedAt: Date.now() };
  return cachedToken.token;
}

export async function searchDocuments(
  cabinetId: string,
  query: Record<string, unknown>,
) {
  const platformUrl = requireEnv("DW_PLATFORM_URL");
  const token = await getToken();
  const url = `${platformUrl}/DocuWare/Platform/FileCabinets/${cabinetId}/Query/DialogExpression`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = await res.json();
  return data.Items || [];
}

export async function getDocument(cabinetId: string, docId: number) {
  const platformUrl = requireEnv("DW_PLATFORM_URL");
  const token = await getToken();
  const url = `${platformUrl}/DocuWare/Platform/FileCabinets/${cabinetId}/Documents/${docId}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Get document failed: ${res.status}`);
  return res.json();
}

export function getDefaultCabinetId(): string {
  return requireEnv("DW_ARMOIRE_TRANSPORT");
}
