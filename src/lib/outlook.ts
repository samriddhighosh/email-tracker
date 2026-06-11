// src/lib/outlook.ts
import { prisma } from "./prisma";

export async function fetchOutlookEmails(userId: string): Promise<string[]> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "azure-ad" },
  });

  if (!account?.access_token) throw new Error("No Outlook account connected");

  // Refresh token if expired
  let accessToken = account.access_token;
  const isExpired =
    account.expires_at && account.expires_at * 1000 < Date.now() + 60_000;

  if (isExpired && account.refresh_token) {
    const tokenRes = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: account.refresh_token,
          grant_type: "refresh_token",
          scope: "Mail.Read offline_access",
        }),
      }
    );
    const tokens = await tokenRes.json();
    if (tokens.access_token) {
      accessToken = tokens.access_token;
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
          expires_at: tokens.expires_in
            ? Math.floor(Date.now() / 1000) + tokens.expires_in
            : undefined,
        },
      });
    }
  }

  // Fetch last 24 hours of inbox messages
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?` +
      `$filter=receivedDateTime ge ${since}&` +
      `$select=from,subject,receivedDateTime,bodyPreview&` +
      `$top=20&$orderby=receivedDateTime desc`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) throw new Error(`Graph API error: ${res.status}`);

  const data = await res.json();
  const messages = data.value ?? [];

  return messages.map((m: any) =>
    [
      `From: ${m.from?.emailAddress?.name ?? ""} <${m.from?.emailAddress?.address ?? ""}>`,
      `Subject: ${m.subject ?? ""}`,
      `Date: ${m.receivedDateTime ?? ""}`,
      m.bodyPreview ?? "",
    ].join("\n")
  );
}
