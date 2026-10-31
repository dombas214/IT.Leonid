const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  },
});

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r/g, "")
    .trim()
    .slice(0, maxLength);
}

function telegramErrorCode(status, description) {
  const text = String(description || "").toLowerCase();
  if (status === 401 || text.includes("unauthorized")) return "telegram_token_invalid";
  if (
    text.includes("chat not found") ||
    text.includes("peer_id_invalid") ||
    text.includes("user not found")
  ) return "telegram_chat_not_found";
  if (
    text.includes("can't initiate") ||
    text.includes("can\u2019t initiate") ||
    text.includes("blocked by user")
  ) return "telegram_start_required";
  if (
    text.includes("not enough rights") ||
    text.includes("not a member") ||
    text.includes("bot was kicked")
  ) return "telegram_no_chat_permission";
  if (status === 429) return "telegram_rate_limited";
  return "telegram_rejected";
}

export async function onRequestPost({ request, env }) {
  const botToken = String(env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(env.TELEGRAM_CHAT_ID || "").trim();

  if (!botToken || !chatId) {
    return json({ ok: false, error: "server_not_configured" }, 500);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 12000) {
    return json({ ok: false, error: "request_too_large" }, 413);
  }

  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return json({ ok: false, error: "invalid_request" }, 400);
  }
  if (rawBody.length > 12000) {
    return json({ ok: false, error: "request_too_large" }, 413);
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
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
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          disable_web_page_preview: true,
        }),
      },
    );

    let telegramResult;
    try {
      telegramResult = await telegramResponse.json();
    } catch {
      console.error("Telegram API returned a non-JSON response", telegramResponse.status);
      return json({ ok: false, error: "telegram_unavailable" }, 502);
    }

    if (!telegramResponse.ok || !telegramResult?.ok) {
      const code = telegramErrorCode(telegramResponse.status, telegramResult?.description);
      // The description is kept in server logs only; never return the bot token or API URL.
      console.error("Telegram sendMessage failed", {
        status: telegramResponse.status,
        errorCode: code,
        description: String(telegramResult?.description || "").slice(0, 300),
      });
      return json({ ok: false, error: code }, 502);
    }

    return json({ ok: true });
  } catch (error) {
    console.error("Telegram request failed", String(error?.message || error).slice(0, 300));
    return json({ ok: false, error: "telegram_unavailable" }, 502);
  }
}
