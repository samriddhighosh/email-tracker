// src/lib/summarize.ts

interface SummarizeOptions {
  style: "bullets" | "paragraph" | "tldr";
  focusArea: "all" | "action" | "urgent";
}

export async function summarizeEmails(
  emails: string[],
  options: SummarizeOptions
): Promise<string> {
  if (emails.length === 0) return "No new emails in the last 24 hours.";

  const styleMap = {
    bullets: "Use clear bullet points. Group by theme or sender if helpful.",
    paragraph: "Write a concise 3–5 sentence paragraph.",
    tldr: "Write a single TL;DR sentence covering the most important point.",
  };

  const focusMap = {
    all: "Summarize all emails.",
    action: "Focus only on emails that require action from the user. Skip newsletters, notifications, and FYIs.",
    urgent: "Focus only on urgent or time-sensitive emails. Skip everything else.",
  };

  const prompt = `You are a personal email assistant. ${focusMap[options.focusArea]} ${styleMap[options.style]}

After the summary, add a new line: TAGS: (comma-separated from: action-required, urgent, follow-up, fyi, newsletter, meeting)

Here are today's emails (${emails.length} total):

${emails.join("\n\n---\n\n")}`;

  // Swapped endpoint to console.groq.com pipeline
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROK_API_KEY}`, // Holds your gsk_ key
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", // Valid, high-performance Groq model slug
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt.slice(0, 30000) }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error("Groq Server Rejection Payload:", errBody);
    throw new Error(
      errBody?.error?.message ?? `Groq API error ${res.status}: ${JSON.stringify(errBody)}`
    );
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "Could not generate summary.";
}