// src/app/api/cron/route.ts
// Call this every day at your desired time via:
//   - Vercel Cron (vercel.json)
//   - GitHub Actions scheduled workflow
//   - Any external cron service (e.g. cron-job.org)
//
// Protect with CRON_SECRET in the Authorization header.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchGmailEmails } from "@/lib/gmail";
import { fetchOutlookEmails } from "@/lib/outlook";
import { summarizeEmails } from "@/lib/summarize";
import { sendDigestEmail } from "@/lib/mailer";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all users who have connected accounts
  const users = await prisma.user.findMany({
    include: { settings: true, accounts: true },
    where: { accounts: { some: {} } },
  });

  const results = await Promise.allSettled(
    users.map(async (user) => {
      if (!user.email) return;

      const style = (user.settings?.style as any) ?? "bullets";
      const focusArea = (user.settings?.focusArea as any) ?? "all";
      const providers = user.accounts.map((a) => a.provider);

      const allEmails: string[] = [];

      if (providers.includes("google")) {
        try {
          allEmails.push(...(await fetchGmailEmails(user.id)));
        } catch {}
      }
      if (providers.includes("azure-ad")) {
        try {
          allEmails.push(...(await fetchOutlookEmails(user.id)));
        } catch {}
      }

      const summary = await summarizeEmails(allEmails, { style, focusArea });

      await prisma.digest.create({
        data: { userId: user.id, summary, emailCount: allEmails.length },
      });

      await sendDigestEmail(user.email, user.name ?? "there", summary);
    })
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  return NextResponse.json({
    processed: users.length,
    failed,
    ok: users.length - failed,
  });
}
