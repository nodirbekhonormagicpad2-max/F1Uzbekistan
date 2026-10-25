const OWNER = "nodirbekhonormagicpad2-max";
const REPO = "F1Uzbekistan";
const BRANCH = "main";
const FILE = "x-videos.json";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function decodeBase64(base64) {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(
    binary,
    char => char.charCodeAt(0)
  );

  return new TextDecoder().decode(bytes);
}

async function passwordMatches(given, expected) {
  if (
    typeof given !== "string" ||
    typeof expected !== "string"
  ) {
    return false;
  }

  const encoder = new TextEncoder();

  const [a, b] = await Promise.all([
    crypto.subtle.digest(
      "SHA-256",
      encoder.encode(given)
    ),
    crypto.subtle.digest(
      "SHA-256",
      encoder.encode(expected)
    )
  ]);

  const first = new Uint8Array(a);
  const second = new Uint8Array(b);

  let difference = 0;

  for (let i = 0; i < first.length; i++) {
    difference |= first[i] ^ second[i];
  }

  return difference === 0 && given.length > 0;
}

function parseXPost(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();

  if (
    ![
      "x.com",
      "www.x.com",
      "twitter.com",
      "www.twitter.com"
    ].includes(host)
  ) {
    return null;
  }

  const match = url.pathname.match(
    /^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)(?:\/.*)?$/
  );

  if (!match) return null;

  return {
    username: match[1],
    id: match[2],
    url: `https://x.com/${match[1]}/status/${match[2]}`
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ADMIN_PASSWORD || !env.GITHUB_TOKEN) {
    return json({
      error: "Server sozlamalari yetishmayapti."
    }, 503);
  }

  const contentType =
    request.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return json({
      error: "JSON yuborilishi kerak."
    }, 415);
  }

  const length = Number(
    request.headers.get("content-length") || 0
  );

  if (length > 10000) {
    return json({
      error: "Ma’lumot juda katta."
    }, 413);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      error: "JSON noto‘g‘ri."
    }, 400);
  }

  const authorized = await passwordMatches(
    body?.password,
    env.ADMIN_PASSWORD
  );

  if (!authorized) {
    return json({
      error: "Admin paroli noto‘g‘ri."
    }, 401);
  }

  const post = parseXPost(body?.url);

  if (!post) {
    return json({
      error: "X postining to‘g‘ri havolasini kiriting."
    }, 400);
  }

  const title = String(
    body.title_uz || ""
  ).trim();

  if (!title || title.length > 160) {
    return json({
      error: "Video nomi 1–160 belgi bo‘lishi kerak."
    }, 400);
  }

  const thumbnail = String(
    body.thumbnail || ""
  ).trim();

  if (thumbnail.length > 500) {
    return json({
      error: "Rasm manzili juda uzun."
    }, 400);
  }

  if (thumbnail) {
    const localImage =
      /^\.\/[A-Za-z0-9_./-]+\.(jpg|jpeg|png|webp)$/i.test(
        thumbnail
      ) &&
      !thumbnail.includes("..");

    let remoteImage = false;

    try {
      const imageURL = new URL(thumbnail);

      remoteImage =
        imageURL.protocol === "https:" &&
        !imageURL.username &&
        !imageURL.password;
    } catch {
      remoteImage = false;
    }

    if (!localImage && !remoteImage) {
      return json({
        error:
          "Rasm uchun ./rasm.jpg yoki HTTPS havolasini kiriting."
      }, 400);
    }
  }

  const apiURL =
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;

  const headers = {
    "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "F1-Cinema-Admin"
  };

  try {
    const currentResponse = await fetch(
      `${apiURL}?ref=${BRANCH}`,
      { headers }
    );

    if (!currentResponse.ok) {
      return json({
        error:
          "GitHub’dan x-videos.json faylini o‘qib bo‘lmadi."
      }, 502);
    }

    const current = await currentResponse.json();

    const existing = JSON.parse(
      decodeBase64(current.content)
    );

    const videos = Array.isArray(existing)
      ? existing
      : Array.isArray(existing.videos)
        ? existing.videos
        : null;

    if (!videos) {
      return json({
        error: "x-videos.json formati noto‘g‘ri."
      }, 500);
    }

    const duplicate = videos.some(video => {
      const existingPost = parseXPost(video.url);

      return (
        String(video.id || "") === post.id ||
        existingPost?.id === post.id
      );
    });

    if (duplicate) {
      return json({
        error: "Bu X videosi allaqachon qo‘shilgan."
      }, 409);
    }

    const newVideo = {
      platform: "x",
      id: post.id,
      url: post.url,
      title_uz: title,
      channel: `@${post.username}`,
      published: new Date().toISOString()
    };

    if (thumbnail) {
      newVideo.thumbnail = thumbnail;
    }

    videos.unshift(newVideo);

    const updated = Array.isArray(existing)
      ? videos
      : { ...existing, videos };

    const saveResponse = await fetch(apiURL, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message:
          `F1 CINEMA: add X video ${post.id}`,
        content: encodeBase64(
          JSON.stringify(updated, null, 2) + "\n"
        ),
        sha: current.sha,
        branch: BRANCH
      })
    });

    if (saveResponse.status === 409) {
      return json({
        error:
          "Fayl ayni paytda yangilangan. Qayta urinib ko‘ring."
      }, 409);
    }

    if (!saveResponse.ok) {
      return json({
        error: "GitHub’ga saqlash amalga oshmadi."
      }, 502);
    }

    return json({
      success: true,
      message: "Video muvaffaqiyatli qo‘shildi!",
      video: newVideo
    });

  } catch (error) {
    console.error(
      "F1 CINEMA ADMIN:",
      error
    );

    return json({
      error: "Serverda xatolik yuz berdi."
    }, 500);
  }
}

export function onRequestGet() {
  return json({
    error: "Ruxsat berilmagan."
  }, 405);
}
