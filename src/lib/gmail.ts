// src/lib/gmail.ts
import { google } from "googleapis";
import { prisma } from "./prisma";

export async function fetchGmailEmails(userId: string): Promise<string[]> {
  // Get the stored access/refresh tokens from DB
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) throw new Error("No Gmail account connected");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Auto-refresh if expired
  oauth2Client.on("tokens", async (tokens) => {
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: tokens.access_token ?? account.access_token,
        ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
        ...(tokens.expiry_date && {
          expires_at: Math.floor(tokens.expiry_date / 1000),
        }),
      },
    });
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Fetch messages from the last 24 hours
  const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: `after:${since} -category:promotions -category:social`,
    maxResults: 30,
  });

  const messages = listRes.data.messages ?? [];
  if (messages.length === 0) return [];

  const emails: string[] = [];

  for (const msg of messages.slice(0, 20)) {
    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Date"],
    });

    const headers = full.data.payload?.headers ?? [];
    const get = (name: string) =>
      headers.find((h) => h.name === name)?.value ?? "";

    const snippet = full.data.snippet ?? "";
    emails.push(
      `From: ${get("From")}\nSubject: ${get("Subject")}\nDate: ${get("Date")}\n${snippet}`
    );
  }

  return emails;
}
