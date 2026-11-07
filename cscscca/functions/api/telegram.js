const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
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

function getTelegramErrorCode(status, description) {
  const text = String(description || "").toLowerCase();
  if (status === 401 || text.includes("unauthorized")) return "telegram_token_invalid";
  if (
    text.includes("chat not found") ||
    text.includes("peer_id_invalid") ||
    text.includes("chat_id_invalid")
  ) return "telegram_chat_not_found";
  if (text.includes("can't initiate") || text.includes("can’t initiate")) {
    return "telegram_start_required";
  }
  if (
    text.includes("blocked by the user") ||
    text.includes("bot was blocked") ||
    text.includes("not enough rights") ||
    text.includes("not a member") ||
    text.includes("bot was kicked") ||
    text.includes("chat_write_forbidden") ||
    text.includes("have no rights to send")
  ) return "telegram_no_chat_permission";
  if (status === 429) return "telegram_rate_limited";
  return "telegram_rejected";
}

async function telegramGet(method, token, params = {}) {
  const url = new URL(`https://api.telegram.org/bot${token}/${method}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Accept": "application/json" },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("telegram_unavailable");
  }
  return { response, data };
}

// Диагностика проверяет не только наличие переменных, но и сам токен,
// а также доступность целевого чата. Секреты и полный ID не возвращаются.
export async function onRequestGet({ env }) {
  const token = String(env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(env.TELEGRAM_CHAT_ID || "").trim();

  if (!token || !chatId) {
    return json({
      ok: false,
      service: "telegram-form",
      tokenConfigured: Boolean(token),
      chatConfigured: Boolean(chatId),
      ready: false,
      error: "server_not_configured",
    }, 503);
  }

  try {
    const me = await telegramGet("getMe", token);
    if (!me.response.ok || !me.data?.ok) {
      const error = getTelegramErrorCode(me.response.status, me.data?.description);
      return json({
        ok: false,
        service: "telegram-form",
        tokenConfigured: true,
        tokenValid: false,
        chatConfigured: true,
        chatAccessible: false,
        ready: false,
        error,
      }, 502);
    }

    const chat = await telegramGet("getChat", token, { chat_id: chatId });
    if (!chat.response.ok || !chat.data?.ok) {
      const error = getTelegramErrorCode(chat.response.status, chat.data?.description);
      return json({
        ok: false,
        service: "telegram-form",
        tokenConfigured: true,
        tokenValid: true,
        chatConfigured: true,
        chatAccessible: false,
        ready: false,
        error,
      }, 502);
    }

    return json({
      ok: true,
      service: "telegram-form",
      tokenConfigured: true,
      tokenValid: true,
      chatConfigured: true,
      chatAccessible: true,
      chatType: chat.data.result?.type || "unknown",
      ready: true,
    });
  } catch (error) {
    console.error("Telegram diagnostics failed", String(error?.message || error).slice(0, 100));
    return json({
      ok: false,
      service: "telegram-form",
      tokenConfigured: true,
      chatConfigured: true,
      ready: false,
      error: "telegram_unavailable",
    }, 502);
  }
}

export async function onRequestPost({ request, env }) {
  const botToken = String(env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(env.TELEGRAM_CHAT_ID || "").trim();

  if (!botToken || !chatId) {
    return json({ ok: false, error: "server_not_configured" }, 500);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ ok: false, error: "invalid_content_type" }, 415);
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
      const code = getTelegramErrorCode(telegramResponse.status, telegramResult?.description);
      console.error("Telegram sendMessage failed", {
        status: telegramResponse.status,
        errorCode: code,
        description: String(telegramResult?.description || "").slice(0, 300),
      });
      return json({ ok: false, error: code }, 502);
    }

    return json({ ok: true, message: "sent" });
  } catch (error) {
    console.error("Telegram request failed", String(error?.message || error).slice(0, 300));
    return json({ ok: false, error: "telegram_unavailable" }, 502);
  }
}
