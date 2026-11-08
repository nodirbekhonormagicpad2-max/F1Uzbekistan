
"use strict";

// Cloudflare Pages: functions/api/telegram-webhook.js

const REPO = "nodirbekhonormagicpad2-max/F1Uzbekistan";
const FILE = "telegram-videos.json";
const BRANCH = "main";
const CHANNEL = "f1cinema";

const GH = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function encode(text) {
  const bytes = new TextEncoder().encode(text);
  let result = "";

  for (let i = 0; i < bytes.length; i += 8192) {
    result += String.fromCharCode(
      ...bytes.subarray(i, i + 8192)
    );
  }

  return btoa(result);
}

function decode(text) {
  const binary = atob(text.replace(/\s/g, ""));

  return new TextDecoder().decode(
    Uint8Array.from(binary, c => c.charCodeAt(0))
  );
}

export async function onRequestPost({ request, env }) {
  if (!env.TELEGRAM_WEBHOOK_SECRET || !env.GITHUB_TOKEN) {
    return json({
      ok: false,
      error: "Server sozlamalari yetishmaydi"
    }, 503);
  }

  const secret = request.headers.get(
    "X-Telegram-Bot-Api-Secret-Token"
  );

  if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return json({ ok: false }, 403);
  }

  let update;

  try {
    update = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }

  const post = update?.channel_post;

  if (
    !post ||
    String(post.chat?.username || "").toLowerCase() !== CHANNEL
  ) {
    return json({ ok: true, ignored: true });
  }

  const isVideo = Boolean(
    post.video ||
    post.document?.mime_type?.startsWith("video/")
  );

  if (!isVideo) {
    return json({ ok: true, ignored: true });
  }

  const item = {
    platform: "telegram",
    id: `telegram-${post.chat.id}-${post.message_id}`,
    url: `https://t.me/${CHANNEL}/${post.message_id}`,
    video_url: `https://t.me/${CHANNEL}/${post.message_id}`,
    title_uz: (post.caption || "F1 CINEMA videosi")
      .slice(0, 160),
    channel: "F1 CINEMA",
    aspect_ratio: "16:9",
    published: new Date(
      (post.date || Math.floor(Date.now() / 1000)) * 1000
    ).toISOString()
  };

  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "F1CinemaTelegramWebhook"
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${GH}?ref=${BRANCH}`, {
      headers
    });

    let videos = [];
    let sha;

    if (response.ok) {
      const file = await response.json();
      sha = file.sha;

      try {
        videos = JSON.parse(decode(file.content));
      } catch {
        return json({
          ok: false,
          error: "JSON fayl noto‘g‘ri"
        }, 500);
      }

      if (!Array.isArray(videos)) {
        return json({
          ok: false,
          error: "Video ro‘yxati noto‘g‘ri"
        }, 500);
      }
    } else if (response.status !== 404) {
      return json({
        ok: false,
        error: "GitHub faylini o‘qib bo‘lmadi"
      }, 502);
    }

    if (videos.some(v => v.id === item.id)) {
      return json({ ok: true, duplicate: true });
    }

    videos.unshift(item);

    const payload = {
      message: `F1 CINEMA Telegram post ${post.message_id}`,
      content: encode(
        JSON.stringify(videos, null, 2) + "\n"
      ),
      branch: BRANCH
    };

    if (sha) {
      payload.sha = sha;
    }

    const saved = await fetch(GH, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (saved.ok) {
      return json({ ok: true });
    }

    if (saved.status !== 409 && saved.status !== 422) {
      return json({
        ok: false,
        error: "GitHub'ga saqlab bo‘lmadi"
      }, 502);
    }
  }

  return json({
    ok: false,
    error: "Qayta urinib ko‘ring"
  }, 503);
}
