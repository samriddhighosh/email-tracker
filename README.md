# 📬 Email Summarizer

An AI-powered morning email digest app. Connects to Gmail and Outlook, fetches your last 24 hours of emails, and sends you a clean summary via Grok AI every morning.

## Stack

- **Next.js 14** (App Router)
- **NextAuth.js** — Gmail + Outlook OAuth
- **Grok API** (xAI) — free AI summarization
- **Prisma + SQLite** — user data (swap to Postgres for production)
- **Resend** — sending digest emails (3k/mo free)
- **Vercel** — hosting + cron jobs (free tier)

---

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in each value (see below for how to get them).

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Getting your API keys

### Grok API (free)
1. Go to [console.x.ai](https://console.x.ai)
2. Create an account and generate an API key
3. Add to `.env.local` as `GROK_API_KEY=xai-...`

### Google / Gmail OAuth
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Go to **APIs & Services → Library** → enable **Gmail API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
5. Application type: **Web application**
6. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   (for production add: `https://yourdomain.com/api/auth/callback/google`)
7. Copy Client ID and Client Secret to `.env.local`

### Microsoft / Outlook OAuth
1. Go to [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory → App registrations → New registration**
3. Name it anything, select **Accounts in any organizational directory and personal Microsoft accounts**
4. Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
   (for production: `https://yourdomain.com/api/auth/callback/azure-ad`)
5. After creating: go to **Certificates & Secrets → New client secret** — copy the value
6. Go to **API Permissions → Add permission → Microsoft Graph → Delegated → Mail.Read** → Grant admin consent
7. Copy Application (client) ID and secret to `.env.local`

### Resend (email delivery)
1. Go to [resend.com](https://resend.com) and create a free account
2. Add your sending domain or use their sandbox for testing
3. Copy API key to `.env.local` as `RESEND_API_KEY`

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add all your `.env.local` variables in Vercel's dashboard under **Settings → Environment Variables**.

The `vercel.json` file sets up a daily cron at 7:00 UTC that calls `/api/cron` to send digests to all users. Adjust the schedule there (`"0 7 * * *"` = 7am UTC daily).

### Cron security
Set a strong `CRON_SECRET` in your environment variables. The cron endpoint requires:
```
Authorization: Bearer <CRON_SECRET>
```
Vercel automatically sends this header when using Vercel Cron.

---

## Production database

For production, swap SQLite for Postgres:

1. In `prisma/schema.prisma` change `provider = "sqlite"` to `provider = "postgresql"`
2. Update `DATABASE_URL` to a Postgres connection string
3. Free options: [Supabase](https://supabase.com), [Neon](https://neon.tech), [Railway](https://railway.app)

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Login page
│   ├── dashboard/page.tsx    # Main dashboard
│   ├── settings/page.tsx     # User settings
│   └── api/
│       ├── auth/             # NextAuth
│       ├── summarize/        # Manual summarize trigger
│       ├── digests/          # Digest history
│       ├── settings/         # Save preferences
│       └── cron/             # Morning digest cron
├── components/               # React components
└── lib/
    ├── auth.ts               # NextAuth config
    ├── prisma.ts             # DB client
    ├── gmail.ts              # Gmail API fetcher
    ├── outlook.ts            # Microsoft Graph fetcher
    ├── summarize.ts          # Grok AI summarizer
    └── mailer.ts             # Resend email sender
```
