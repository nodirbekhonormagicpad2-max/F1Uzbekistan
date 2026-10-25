const OWNER = "nodirbekhonormagicpad2-max";
const REPO = "F1Uzbekistan";
const BRANCH = "main";
const FILE = "facebook-videos.json";

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

function parseFacebookVideo(value) {
  if (typeof value !== "string") {
    return null;
  }

  let url;

  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:") {
    return null;
  }

  const host = url.hostname.toLowerCase();

  const allowedHosts = [
    "facebook.com",
    "www.facebook.com",
    "m.facebook.com",
    "web.facebook.com"
  ];

  if (!allowedHosts.includes(host)) {
    return null;
  }

  const path = url.pathname;

  const reelMatch = path.match(
    /^\/(?:reel|reels)\/([A-Za-z0-9_-]+)\/?$/i
  );

  if (reelMatch) {
    const id = reelMatch[1];

    return {
      id: "reel-" + id,
      url: "https://www.facebook.com/reel/" + id + "/",
      type: "reel",
      aspect_ratio: "9:16"
    };
  }

  const shareMatch = path.match(
    /^\/share\/(r|v)\/([A-Za-z0-9_-]+)\/?$/i
  );

  if (shareMatch) {
    const kind = shareMatch[1].toLowerCase();
    const id = shareMatch[2];

    return {
      id: "share-" + kind + "-" + id,
      url:
        "https://www.facebook.com/share/" +
        kind +
        "/" +
        id +
        "/",
      type: kind === "r" ? "reel" : "video",
      aspect_ratio: kind === "r" ? "9:16" : "16:9"
    };
  }

  if (/^\/watch\/?$/i.test(path)) {
    const id = url.searchParams.get("v");

    if (id && /^[0-9]+$/.test(id)) {
      return {
        id: "video-" + id,
        url:
          "https://www.facebook.com/watch/?v=" +
          id,
        type: "video",
        aspect_ratio: "16:9"
      };
    }
  }

  const videoMatch = path.match(
    /^\/(?:[^/]+\/)?videos\/([0-9]+)\/?$/i
  );

  if (videoMatch) {
    const id = videoMatch[1];

    return {
      id: "video-" + id,
      url:
        "https://www.facebook.com/watch/?v=" +
        id,
      type: "video",
      aspect_ratio: "16:9"
    };
  }

  return null;
}

function validThumbnail(value) {
  if (!value) return true;

  if (
    typeof value !== "string" ||
    value.length > 500
  ) {
    return false;
  }

  const localImage =
    /^\.\/[A-Za-z0-9_./-]+\.(jpg|jpeg|png|webp)$/i
      .test(value) &&
    !value.includes("..");

  if (localImage) {
    return true;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function existingVideoKey(video) {
  if (!video || typeof video !== "object") {
    return "";
  }

  const parsed = parseFacebookVideo(video.url || "");

  return parsed ? parsed.url : "";
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ADMIN_PASSWORD || !env.GITHUB_TOKEN) {
    return json({
      success: false,
      error: "Server sozlamalari yetishmayapti."
    }, 503);
  }

  const contentType =
    request.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return json({
      success: false,
      error: "JSON yuborilishi kerak."
    }, 415);
  }

  const length = Number(
    request.headers.get("content-length") || 0
  );

  if (length > 10000) {
    return json({
      success: false,
      error: "Ma’lumot juda katta."
    }, 413);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      success: false,
      error: "JSON noto‘g‘ri."
    }, 400);
  }

  const authorized = await passwordMatches(
    body?.password,
    env.ADMIN_PASSWORD
  );

  if (!authorized) {
    return json({
      success: false,
      error: "Admin paroli noto‘g‘ri."
    }, 401);
  }

  const post = parseFacebookVideo(body?.url);

  if (!post) {
    return json({
      success: false,
      error:
        "Facebook video havolasi noto‘g‘ri. " +
        "Reel, share/r, share/v, watch yoki videos " +
        "havolasini kiriting."
    }, 400);
  }

  const title = String(
    body.title_uz || ""
  ).trim();

  if (!title || title.length > 160) {
    return json({
      success: false,
      error: "Video nomi 1–160 belgi bo‘lishi kerak."
    }, 400);
  }

  const thumbnail = String(
    body.thumbnail || ""
  ).trim();

  if (!validThumbnail(thumbnail)) {
    return json({
      success: false,
      error:
        "Rasm uchun ./rasm.jpg yoki HTTPS havolasini kiriting."
    }, 400);
  }

  const apiURL =
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;

  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "F1-Cinema-Admin"
  };

  try {
    const currentResponse = await fetch(
      `${apiURL}?ref=${encodeURIComponent(BRANCH)}`,
      {
        headers,
        cache: "no-store"
      }
    );

    let existing = [];
    let sha;

    if (currentResponse.status === 404) {
      existing = [];

    } else if (currentResponse.ok) {
      const current = await currentResponse.json();

      sha = current.sha;

      existing = JSON.parse(
        decodeBase64(current.content)
      );

    } else {
      return json({
        success: false,
        error:
          "GitHub’dan video ma’lumotlarini o‘qib bo‘lmadi. " +
          "HTTP: " +
          currentResponse.status
      }, 502);
    }

    const videos = Array.isArray(existing)
      ? existing
      : Array.isArray(existing.videos)
        ? existing.videos
        : null;

    if (!videos) {
      return json({
        success: false,
        error:
          "facebook-videos.json formati noto‘g‘ri."
      }, 500);
    }

    const duplicate = videos.some(video => {
      if (!video || typeof video !== "object") {
        return false;
      }

      const sameURL =
        existingVideoKey(video) === post.url;

      const sameID =
        String(video.id || "") === post.id;

      return sameURL || sameID;
    });

    if (duplicate) {
      return json({
        success: false,
        error:
          "Bu Facebook videosi allaqachon qo‘shilgan."
      }, 409);
    }

    const newVideo = {
      platform: "facebook",
      type: post.type,
      id: post.id,
      url: post.url,
      title_uz: title,
      channel: "Facebook",
      published: new Date().toISOString(),
      aspect_ratio: post.aspect_ratio,
      approved: true
    };

    if (thumbnail) {
      newVideo.thumbnail = thumbnail;
    }

    videos.unshift(newVideo);

    const updated = Array.isArray(existing)
      ? videos
      : {
          ...existing,
          videos
        };

    const payload = {
      message:
        "F1 CINEMA: add Facebook video " +
        post.id,

      content: encodeBase64(
        JSON.stringify(updated, null, 2) + "\n"
      ),

      branch: BRANCH
    };

    if (sha) {
      payload.sha = sha;
    }

    const saveResponse = await fetch(apiURL, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (saveResponse.status === 409) {
      return json({
        success: false,
        error:
          "Fayl ayni paytda yangilangan. " +
          "Qayta urinib ko‘ring."
      }, 409);
    }

    if (!saveResponse.ok) {
      return json({
        success: false,
        error:
          "GitHub’ga saqlash amalga oshmadi. " +
          "HTTP: " +
          saveResponse.status
      }, 502);
    }

    return json({
      success: true,
      message:
        "Facebook videosi muvaffaqiyatli qo‘shildi!",
      video: newVideo
    });

  } catch (error) {
    console.error(
      "F1 CINEMA ADMIN:",
      error
    );

    return json({
      success: false,
      error: "Serverda xatolik yuz berdi."
    }, 500);
  }
}

export function onRequestGet() {
  return json({
    success: false,
    error: "Ruxsat berilmagan."
  }, 405);
}
