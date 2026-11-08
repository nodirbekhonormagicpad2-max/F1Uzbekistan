
"use strict";

const REPO = "nodirbekhonormagicpad2-max/F1Uzbekistan";
const FILE = "telegram-videos.json";
const BRANCH = "main";
const CHANNEL = "f1cinema";
const CHANNEL_ID = "-1004331486193";

const GH = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
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

function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "F1CinemaTelegramWebhook"
  };
}

async function telegramAPI(env, method, data) {
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }
  );

  return response.json();
}

async function reply(env, chatId, text) {
  try {
    await telegramAPI(env, "sendMessage", {
      chat_id: chatId,
      text
    });
  } catch (error) {
    console.error("Telegram reply:", error);
  }
}

async function readVideos(env) {
  const response = await fetch(
    `${GH}?ref=${BRANCH}`,
    { headers: githubHeaders(env) }
  );

  if (response.status === 404) {
    return { videos: [], sha: null };
  }

  if (!response.ok) {
    throw new Error("GitHub faylini o'qib bo'lmadi");
  }

  const file = await response.json();
  const videos = JSON.parse(decode(file.content));

  if (!Array.isArray(videos)) {
    throw new Error("Video ro'yxati noto'g'ri");
  }

  return { videos, sha: file.sha };
}

async function saveVideos(env, videos, sha, message) {
  const payload = {
    message,
    content: encode(
      JSON.stringify(videos, null, 2) + "\n"
    ),
    branch: BRANCH
  };

  if (sha) {
    payload.sha = sha;
  }

  const response = await fetch(GH, {
    method: "PUT",
    headers: {
      ...githubHeaders(env),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (response.ok) return true;

  if (response.status === 409 || response.status === 422) {
    return false;
  }

  throw new Error("GitHub'ga saqlab bo'lmadi");
}

async function getThumbnail(post, env) {
  const video = post.video || post.document;

  const thumbs = [
    ...(video?.thumbnail ? [video.thumbnail] : []),
    ...(video?.thumb ? [video.thumb] : []),
    ...(post.photo || []).slice(-1)
  ];

  const fileId = thumbs[0]?.file_id;

  if (!fileId || !env.IMAGEKIT_PRIVATE_KEY) {
    return "";
  }

  try {
    const info = await telegramAPI(env, "getFile", {
      file_id: fileId
    });

    if (!info.ok || !info.result?.file_path) {
      return "";
    }

    const imageResponse = await fetch(
      `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${info.result.file_path}`
    );

    if (!imageResponse.ok) return "";

    const imageBlob = await imageResponse.blob();
    const form = new FormData();

    form.append(
      "file",
      imageBlob,
      "telegram-thumbnail.jpg"
    );

    form.append(
      "fileName",
      `f1cinema-${post.message_id}.jpg`
    );

    form.append("folder", "/f1cinema");
    form.append("useUniqueFileName", "true");

    const uploadResponse = await fetch(
      "https://upload.imagekit.io/api/v1/files/upload",
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + btoa(env.IMAGEKIT_PRIVATE_KEY + ":")
        },
        body: form
      }
    );

    if (!uploadResponse.ok) return "";

    const uploaded = await uploadResponse.json();

    return uploaded.url || "";
  } catch (error) {
    console.error("Thumbnail error:", error);
    return "";
  }
}

async function addVideo(post, env) {
  const id = `telegram-${post.chat.id}-${post.message_id}`;
  const thumbnail = await getThumbnail(post, env);

  const item = {
    platform: "telegram",
    id,
    url: `https://t.me/${CHANNEL}/${post.message_id}`,
    video_url: `https://t.me/${CHANNEL}/${post.message_id}`,
    title_uz: (post.caption || "F1 CINEMA videosi")
      .slice(0, 160),
    thumbnail,
    thumbnail_url: thumbnail,
    channel: "F1 CINEMA",
    aspect_ratio: "16:9",
    published: new Date(
      (post.date || Math.floor(Date.now() / 1000)) * 1000
    ).toISOString()
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const { videos, sha } = await readVideos(env);

    if (videos.some(v => v.id === id)) {
      return { ok: true, duplicate: true };
    }

    videos.unshift(item);

    const saved = await saveVideos(
      env,
      videos,
      sha,
      `F1 CINEMA Telegram post ${post.message_id}`
    );

    if (saved) {
      return {
        ok: true,
        thumbnail: Boolean(thumbnail)
      };
    }
  }

  throw new Error("GitHub yangilashda ziddiyat");
}

async function removeFromSite(messageId, env) {
  const id = `telegram-${CHANNEL_ID}-${messageId}`;
  const url = `https://t.me/${CHANNEL}/${messageId}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { videos, sha } = await readVideos(env);

    const remaining = videos.filter(v =>
      v.id !== id &&
      v.url !== url &&
      v.video_url !== url
    );

    if (remaining.length === videos.length) {
      return { removed: false };
    }

    const saved = await saveVideos(
      env,
      remaining,
      sha,
      `F1 CINEMA delete Telegram post ${messageId}`
    );

    if (saved) {
      return { removed: true };
    }
  }

  throw new Error("GitHub yangilashda ziddiyat");
}

async function handleDelete(message, env) {
  const chatId = message.chat.id;
  const userId = String(message.from?.id || "");

  // Faqat shaxsiy chatda ishlaydi.
  if (message.chat.type !== "private") {
    return { ok: true, ignored: true };
  }

  // Ruxsatsiz foydalanuvchilar o'chira olmaydi.
  if (
    !env.TELEGRAM_ADMIN_ID ||
    userId !== String(env.TELEGRAM_ADMIN_ID).trim()
  ) {
    await reply(
      env,
      chatId,
      "⛔ Bu buyruq faqat administrator uchun."
    );

    return { ok: true, unauthorized: true };
  }

  const text = (message.text || "").trim();

  if (/^\/start(?:@\w+)?$/i.test(text)) {
    await reply(
      env,
      chatId,
      "🎬 F1 CINEMA boshqaruvi\n\n" +
      "Videoni o'chirish:\n" +
      "/delete 3\n\n" +
      "Bu yerda 3 — Telegram kanalidagi post raqami."
    );

    return { ok: true };
  }

  const match = text.match(
    /^\/delete(?:@\w+)?\s+(\d+)$/i
  );

  if (!match) {
    await reply(
      env,
      chatId,
      "Buyruq namunasi: /delete 3"
    );

    return { ok: true };
  }

  const messageId = Number(match[1]);

  if (
    !Number.isSafeInteger(messageId) ||
    messageId <= 0
  ) {
    await reply(env, chatId, "❌ Post raqami noto'g'ri.");
    return { ok: true };
  }

  // Avval saytdagi yozuv mavjudligini tekshiramiz.
  const { videos } = await readVideos(env);

  const id = `telegram-${CHANNEL_ID}-${messageId}`;
  const url = `https://t.me/${CHANNEL}/${messageId}`;

  const exists = videos.some(v =>
    v.id === id ||
    v.url === url ||
    v.video_url === url
  );

  if (!exists) {
    await reply(
      env,
      chatId,
      "❌ Bu video sayt ro'yxatida topilmadi."
    );

    return { ok: true };
  }

  // Avval Telegram kanalidan o'chiramiz.
  const deleted = await telegramAPI(
    env,
    "deleteMessage",
    {
      chat_id: CHANNEL_ID,
      message_id: messageId
    }
  );

  if (!deleted.ok) {
    await reply(
      env,
      chatId,
      "❌ Telegram'dan o'chirib bo'lmadi.\n" +
      "Botning kanaldagi o'chirish huquqini va " +
      "post 48 soatdan eski emasligini tekshiring.\n\n" +
      "Sabab: " +
      (deleted.description || "Noma'lum xatolik")
    );

    return { ok: true, deleted: false };
  }

  // Keyin sayt ro'yxatidan olib tashlaymiz.
  try {
    const result = await removeFromSite(messageId, env);

    await reply(
      env,
      chatId,
      result.removed
        ? `✅ ${messageId}-video Telegram'dan va saytdan o'chirildi!`
        : "⚠️ Telegram'dan o'chirildi, lekin sayt ro'yxatida topilmadi."
    );

    return { ok: true, deleted: true };
  } catch (error) {
    console.error("Delete site error:", error);

    await reply(
      env,
      chatId,
      "⚠️ Video Telegram'dan o'chirildi, " +
      "ammo sayt ro'yxatini yangilashda xatolik bo'ldi.\n" +
      "telegram-videos.json faylini tekshiring."
    );

    return { ok: false, partial: true };
  }
}

export async function onRequestPost({ request, env }) {
  if (
    !env.TELEGRAM_WEBHOOK_SECRET ||
    !env.TELEGRAM_BOT_TOKEN ||
    !env.GITHUB_TOKEN
  ) {
    return json({
      ok: false,
      error: "Cloudflare sozlamalari yetishmaydi"
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

  try {
    // Administratorning shaxsiy botga yozgan buyrug'i.
    const message = update?.message;

    if (message?.text?.startsWith("/")) {
      return json(await handleDelete(message, env));
    }

    // Kanalga yangi video joylanganda.
    const post = update?.channel_post;

    if (
      !post ||
      String(post.chat?.username || "").toLowerCase()
        !== CHANNEL
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

    return json(await addVideo(post, env));
  } catch (error) {
    console.error("Webhook error:", error);

    return json({
      ok: false,
      error: "Video amaliyotida xatolik"
    }, 500);
  }
}
