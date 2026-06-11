// src/app/api/summarize/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchGmailEmails } from "@/lib/gmail";
import { fetchOutlookEmails } from "@/lib/outlook";
import { summarizeEmails } from "@/lib/summarize";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const settings = await prisma.settings.findUnique({ where: { userId } });
  const style = (settings?.style as any) ?? "bullets";
  const focusArea = (settings?.focusArea as any) ?? "all";

  // Fetch from all connected providers
  const allEmails: string[] = [];
  const errors: string[] = [];

  const accounts = await prisma.account.findMany({ where: { userId } });
  const providers = accounts.map((a) => a.provider);

  if (providers.includes("google")) {
    try {
      const emails = await fetchGmailEmails(userId);
      allEmails.push(...emails);
    } catch (e: any) {
      errors.push(`Gmail: ${e.message}`);
    }
  }

  if (providers.includes("azure-ad")) {
    try {
      const emails = await fetchOutlookEmails(userId);
      allEmails.push(...emails);
    } catch (e: any) {
      errors.push(`Outlook: ${e.message}`);
    }
  }

  if (allEmails.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  }

  const summary = await summarizeEmails(allEmails, { style, focusArea });

  // Save to digest history
  await prisma.digest.create({
    data: { userId, summary, emailCount: allEmails.length },
  });

  return NextResponse.json({
    summary,
    emailCount: allEmails.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
