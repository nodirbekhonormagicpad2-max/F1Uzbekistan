
export async function onRequestPost({ request, env }) {
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });

  if (
    !env.ADMIN_PASSWORD ||
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return json({
      ok: false,
      error: "Cloudflare maxfiy sozlamalari yetishmaydi"
    }, 500);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      ok: false,
      error: "JSON noto‘g‘ri"
    }, 400);
  }

  if (
    typeof body.password !== "string" ||
    body.password !== env.ADMIN_PASSWORD
  ) {
    return json({
      ok: false,
      error: "Admin paroli noto‘g‘ri"
    }, 401);
  }

  const webhookUrl =
    new URL("/api/telegram-webhook", request.url).toString();

  const telegramUrl =
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`;

  try {
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ["channel_post", "message"],
        drop_pending_updates: false
      })
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      return json({
        ok: false,
        error: result.description ||
          "Telegram webhook o‘rnatilmadi"
      }, 502);
    }

    return json({
      ok: true,
      message: "Telegram webhook muvaffaqiyatli ulandi!",
      webhook: webhookUrl
    });
  } catch {
    return json({
      ok: false,
      error: "Telegram bilan bog‘lanib bo‘lmadi"
    }, 502);
  }
}
