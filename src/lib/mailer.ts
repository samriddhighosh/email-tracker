// src/lib/mailer.ts

export async function sendDigestEmail(
  toEmail: string,
  toName: string,
  summary: string
) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, sans-serif; color: #1a1a1a; background: #f9f9f9; margin: 0; padding: 0; }
    .wrap { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; overflow: hidden; }
    .header { background: #f0f4ff; padding: 24px 32px; border-bottom: 1px solid #e5e5e5; }
    .header h1 { font-size: 18px; font-weight: 500; margin: 0; }
    .header p { font-size: 13px; color: #666; margin: 4px 0 0; }
    .body { padding: 28px 32px; font-size: 15px; line-height: 1.7; }
    .body ul { padding-left: 20px; }
    .body li { margin-bottom: 8px; }
    .footer { padding: 16px 32px; background: #f9f9f9; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; }
    .footer a { color: #999; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Your morning email digest</h1>
      <p>${today}</p>
    </div>
    <div class="body">
      ${summary.replace(/\n/g, "<br>").replace(/^- /gm, "• ")}
    </div>
    <div class="footer">
      You're receiving this because you set up a morning digest. <a href="${process.env.NEXTAUTH_URL}/settings">Manage settings</a>
    </div>
  </div>
</body>
</html>`;

  // Using Resend API (https://resend.com - free tier: 3k emails/mo)
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL,
      to: toEmail,
      subject: `📬 Your email digest — ${today}`,
      html: htmlBody,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to send digest: ${JSON.stringify(err)}`);
  }
}
