import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "database",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Highlight-start
      allowDangerousEmailAccountLinking: true,
      // Highlight-end
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: "common",
      // Highlight-start
      allowDangerousEmailAccountLinking: true,
      // Highlight-end
      authorization: {
        params: {
          scope: "openid profile email offline_access Mail.Read",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // If it's a Google sign in, safely strip out the breaking property
      if (account && account.provider === "google") {
        if ("refresh_token_expires_in" in account) {
          delete (account as any).refresh_token_expires_in;
        }
      }
      return true; // Allows the sign in to continue completely
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Force direct clean pathing to dashboard
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/",
  },
};