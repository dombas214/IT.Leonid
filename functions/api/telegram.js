const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});

function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r/g, "")
    .trim()
    .slice(0, maxLength);
}

export async function onRequestPost({ request, env }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return json({ ok: false, error: "server_not_configured" }, 500);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 12000) return json({ ok: false, error: "request_too_large" }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const name = cleanText(body.name, 100);
  const contact = cleanText(body.contact, 200);
  const projectType = cleanText(body.projectType, 120);
  const details = cleanText(body.details, 2500);

  if (!name || !contact || !details) {
    return json({ ok: false, error: "required_fields_missing" }, 400);
  }

  const message = [
    "🆕 Новая заявка с сайта",
    "",
    `Имя: ${name}`,
    `Контакт: ${contact}`,
    `Тип сайта: ${projectType || "Не указан"}`,
    "",
    "Описание задачи:",
    details,
  ].join("\n");

  try {
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${env.8860363912:AAF-fJ4Wx715qE8uWnmt6Ugooptd9S7b6ts}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: env.6104005597, text: message }),
      },
    );
    const telegramResult = await telegramResponse.json();
    if (!telegramResponse.ok || !telegramResult.ok) {
      return json({ ok: false, error: "telegram_delivery_failed" }, 502);
    }
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: "telegram_unavailable" }, 502);
  }
}
