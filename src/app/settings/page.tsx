// src/app/settings/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SettingsClient } from "@/components/SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  return <SettingsClient />;
}
