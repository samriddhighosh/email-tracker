// src/app/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.settings.findUnique({
    where: { userId: session.user.id },
  });

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { provider: true },
  });

  return NextResponse.json({
    settings: settings ?? {},
    connectedProviders: accounts.map((a) => a.provider),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { digestTime, timezone, style, focusArea } = body;

  const settings = await prisma.settings.upsert({
    where: { userId: session.user.id },
    update: { digestTime, timezone, style, focusArea },
    create: {
      userId: session.user.id,
      digestTime: digestTime ?? "07:00",
      timezone: timezone ?? "UTC",
      style: style ?? "bullets",
      focusArea: focusArea ?? "all",
    },
  });

  return NextResponse.json({ settings });
}
