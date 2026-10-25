const OWNER = "nodirbekhonormagicpad2-max";
const REPO = "F1Uzbekistan";
const BRANCH = "main";
const FILE = "uploaded-videos.json";

const MAX_SIZE = 50 * 1024 * 1024;

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

  return new TextDecoder().decode(
    Uint8Array.from(binary, char => char.charCodeAt(0))
  );
}

async function passwordMatches(given, expected) {
  if (
    typeof given !== "string" ||
    typeof expected !== "string" ||
    !given
  ) {
    return false;
  }

  const encoder = new TextEncoder();

  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(given)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected))
  ]);

  const first = new Uint8Array(a);
  const second = new Uint8Array(b);

  let difference = 0;

  for (let i = 0; i < first.length; i++) {
    difference |= first[i] ^ second[i];
  }

  return difference === 0;
}

function validThumbnail(value) {
  if (!value) return true;

  if (value.length > 500) return false;

  if (
    /^\.\/[A-Za-z0-9_./-]+\.(jpg|jpeg|png|webp)$/i.test(value) &&
    !value.includes("..")
  ) {
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

async function saveVideoToGitHub(env, newVideo) {
  const apiURL =
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;

  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "F1-Cinema-Admin"
  };

  const currentResponse = await fetch(
    `${apiURL}?ref=${BRANCH}`,
    { headers }
  );

  let videos = [];
  let sha;

  if (currentResponse.status === 404) {
    // Fayl hali mavjud bo‘lmasa, yangisini yaratamiz.
  } else if (currentResponse.ok) {
    const current = await currentResponse.json();

    sha = current.sha;

    const existing = JSON.parse(
      decodeBase64(current.content)
    );

    videos = Array.isArray(existing)
      ? existing
      : Array.isArray(existing.videos)
        ? existing.videos
        : null;

    if (!videos) {
      throw new Error("uploaded-videos.json formati noto‘g‘ri.");
    }
  } else {
    throw new Error("GitHub video ro‘yxatini o‘qib bo‘lmadi.");
  }

  videos.unshift(newVideo);

  const payload = {
    message: `F1 CINEMA: upload ${newVideo.id}`,
    content: encodeBase64(
      JSON.stringify(videos, null, 2) + "\n"
    ),
    branch: BRANCH
  };

  if (sha) {
    payload.sha = sha;
  }

  const response = await fetch(apiURL, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("GitHub video ro‘yxatini saqlab bo‘lmadi.");
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (
    !env.ADMIN_PASSWORD ||
    !env.GITHUB_TOKEN ||
    !env.VIDEO_BUCKET
  ) {
    return json({
      error:
        "Server sozlamalari yetishmayapti. " +
        "ADMIN_PASSWORD, GITHUB_TOKEN va VIDEO_BUCKET ni tekshiring."
    }, 503);
  }

  const contentType =
    request.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    return json({
      error: "Video FormData orqali yuborilishi kerak."
    }, 415);
  }

  const requestLength = Number(
    request.headers.get("content-length") || 0
  );

  if (requestLength > MAX_SIZE + 1024 * 1024) {
    return json({
      error: "Video juda katta. Maksimal hajm 50 MB."
    }, 413);
  }

  let form;

  try {
    form = await request.formData();
  } catch {
    return json({
      error: "Yuborilgan forma noto‘g‘ri."
    }, 400);
  }

  const authorized = await passwordMatches(
    form.get("password"),
    env.ADMIN_PASSWORD
  );

  if (!authorized) {
    return json({
      error: "Admin paroli noto‘g‘ri."
    }, 401);
  }

  const file = form.get("video");

  if (!(file instanceof File)) {
    return json({
      error: "Video fayl tanlanmagan."
    }, 400);
  }

  if (!file.size || file.size > MAX_SIZE) {
    return json({
      error: "Video hajmi 1 baytdan 50 MB gacha bo‘lishi kerak."
    }, 413);
  }

  const extension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();

  const allowed = {
    mp4: "video/mp4",
    webm: "video/webm"
  };

  if (!allowed[extension]) {
    return json({
      error: "Faqat MP4 yoki WebM video yuklash mumkin."
    }, 400);
  }

  if (
    file.type &&
    file.type !== allowed[extension] &&
    file.type !== "application/octet-stream"
  ) {
    return json({
      error: "Video fayl turi mos kelmadi."
    }, 400);
  }

  const title = String(
    form.get("title_uz") || ""
  ).trim();

  if (!title || title.length > 160) {
    return json({
      error: "Video nomi 1–160 belgi bo‘lishi kerak."
    }, 400);
  }

  const thumbnail = String(
    form.get("thumbnail") || ""
  ).trim();

  if (!validThumbnail(thumbnail)) {
    return json({
      error: "Muqova rasmi havolasi noto‘g‘ri."
    }, 400);
  }

  const aspectRatio = String(
    form.get("aspect_ratio") || "9:16"
  );

  if (!["9:16", "16:9"].includes(aspectRatio)) {
    return json({
      error: "Video formati noto‘g‘ri."
    }, 400);
  }

  const id = crypto.randomUUID();

  const key = `videos/${id}.${extension}`;

  const videoURL = `/api/media/${key}`;

  try {
    // Faylni Cloudflare R2 bucket’ga saqlaymiz.
    await env.VIDEO_BUCKET.put(
      key,
      file.stream(),
      {
        httpMetadata: {
          contentType: allowed[extension],
          cacheControl: "public, max-age=3600"
        },
        customMetadata: {
          title: title.slice(0, 160)
        }
      }
    );

    const newVideo = {
      platform: "upload",
      id,
      url: videoURL,
      video_url: videoURL,
      title_uz: title,
      channel: "F1 Uzbekistan TV",
      aspect_ratio: aspectRatio,
      published: new Date().toISOString()
    };

    if (thumbnail) {
      newVideo.thumbnail = thumbnail;
    }

    try {
      await saveVideoToGitHub(env, newVideo);
    } catch (error) {
      // Ro‘yxatga qo‘shilmasa, R2 faylini ham o‘chiramiz.
      await env.VIDEO_BUCKET.delete(key).catch(() => {});

      console.error("GitHub save error:", error);

      return json({
        error:
          "Video ro‘yxatga saqlanmadi. " +
          "GitHub token ruxsatlarini tekshiring."
      }, 502);
    }

    return json({
      success: true,
      message: "Video muvaffaqiyatli yuklandi!",
      video: newVideo
    });

  } catch (error) {
    console.error("Upload error:", error);

    return json({
      error: "Video yuklashda server xatoligi yuz berdi."
    }, 500);
  }
}

export function onRequestGet() {
  return json({
    error: "Bu manzil faqat video yuklash uchun."
  }, 405);
}
