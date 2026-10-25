"use strict";

const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;
const PART_SIZE = 5 * 1024 * 1024;
const MAX_PARTS = 205;

const ALLOWED_TYPES = {
  mp4: "video/mp4",
  webm: "video/webm"
};

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

  return difference === 0;
}

function validKey(key) {
  return (
    typeof key === "string" &&
    /^videos\/[a-f0-9-]{36}\.(mp4|webm)$/i.test(key)
  );
}

function validUploadId(uploadId) {
  return (
    typeof uploadId === "string" &&
    uploadId.length > 0 &&
    uploadId.length < 500
  );
}

function validThumbnail(value) {
  if (!value) return true;

  if (
    typeof value !== "string" ||
    value.length > 500
  ) {
    return false;
  }

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
    Uint8Array.from(
      binary,
      char => char.charCodeAt(0)
    )
  );
}

async function saveToGitHub(env, video) {
  const apiURL =
    "https://api.github.com/repos/" +
    "nodirbekhonormagicpad2-max/" +
    "F1Uzbekistan/contents/" +
    "uploaded-videos.json";

  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "F1-Cinema-Admin"
  };

  const currentResponse = await fetch(
    apiURL + "?ref=main",
    { headers }
  );

  let videos = [];
  let sha;

  if (currentResponse.status === 404) {
    // Fayl hali mavjud emas.
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
      throw new Error(
        "uploaded-videos.json formati noto‘g‘ri."
      );
    }
  } else {
    throw new Error(
      "GitHub ro‘yxatini o‘qib bo‘lmadi."
    );
  }

  if (videos.some(item => item.id === video.id)) {
    return;
  }

  videos.unshift(video);

  const payload = {
    message: `F1 CINEMA: multipart ${video.id}`,
    content: encodeBase64(
      JSON.stringify(videos, null, 2) + "\n"
    ),
    branch: "main"
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
    throw new Error(
      "GitHub ro‘yxatiga yozib bo‘lmadi."
    );
  }
}

async function readJSON(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function onRequestPost({ request, env }) {
  if (
    !env.ADMIN_PASSWORD ||
    !env.GITHUB_TOKEN ||
    !env.VIDEO_BUCKET
  ) {
    return json({
      success: false,
      error:
        "ADMIN_PASSWORD, GITHUB_TOKEN yoki " +
        "VIDEO_BUCKET sozlanmagan."
    }, 503);
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    // =====================================
    // 1. VIDEO YUKLASHNI BOSHLASH
    // =====================================

    if (action === "init") {
      const body = await readJSON(request);

      if (!body) {
        return json({
          success: false,
          error: "JSON ma’lumot noto‘g‘ri."
        }, 400);
      }

      if (!await passwordMatches(
        body.password,
        env.ADMIN_PASSWORD
      )) {
        return json({
          success: false,
          error: "Admin paroli noto‘g‘ri."
        }, 401);
      }

      const extension = String(
        body.extension || ""
      ).toLowerCase();

      const size = Number(body.size);

      if (!ALLOWED_TYPES[extension]) {
        return json({
          success: false,
          error: "Faqat MP4 va WebM yuklash mumkin."
        }, 400);
      }

      if (
        !Number.isSafeInteger(size) ||
        size <= 0 ||
        size > MAX_VIDEO_SIZE
      ) {
        return json({
          success: false,
          error: "Video hajmi 1 GB dan oshmasligi kerak."
        }, 400);
      }

      const title = String(
        body.title_uz || ""
      ).trim();

      const thumbnail = String(
        body.thumbnail || ""
      ).trim();

      const aspectRatio = String(
        body.aspect_ratio || "16:9"
      );

      if (!title || title.length > 160) {
        return json({
          success: false,
          error: "Video nomi noto‘g‘ri."
        }, 400);
      }

      if (!validThumbnail(thumbnail)) {
        return json({
          success: false,
          error: "Muqova rasmi havolasi noto‘g‘ri."
        }, 400);
      }

      if (!["9:16", "16:9"].includes(aspectRatio)) {
        return json({
          success: false,
          error: "Video formati noto‘g‘ri."
        }, 400);
      }

      const id = crypto.randomUUID();
      const key = `videos/${id}.${extension}`;

      const upload =
        await env.VIDEO_BUCKET.createMultipartUpload(
          key,
          {
            httpMetadata: {
              contentType: ALLOWED_TYPES[extension]
            },
            customMetadata: {
              expectedSize: String(size)
            }
          }
        );

      return json({
        success: true,
        id,
        key,
        uploadId: upload.uploadId,
        partSize: PART_SIZE,
        maxParts: MAX_PARTS
      });
    }

    // =====================================
    // 2. BINAR VIDEO QISMINI YUKLASH
    // =====================================

    if (action === "part") {
      const key = request.headers.get("X-Upload-Key");
      const uploadId =
        request.headers.get("X-Upload-Id");

      const partNumber = Number(
        request.headers.get("X-Part-Number")
      );

      const adminPassword =
        request.headers.get("X-Admin-Password");

      if (!await passwordMatches(
        adminPassword,
        env.ADMIN_PASSWORD
      )) {
        return json({
          success: false,
          error: "Admin paroli noto‘g‘ri."
        }, 401);
      }

      if (
        !validKey(key) ||
        !validUploadId(uploadId) ||
        !Number.isInteger(partNumber) ||
        partNumber < 1 ||
        partNumber > MAX_PARTS
      ) {
        return json({
          success: false,
          error: "Video qismi ma’lumotlari noto‘g‘ri."
        }, 400);
      }

      const contentLength = Number(
        request.headers.get("Content-Length")
      );

      if (
        Number.isFinite(contentLength) &&
        contentLength > PART_SIZE
      ) {
        return json({
          success: false,
          error: "Video qismi 5 MB dan katta."
        }, 413);
      }

      const buffer = await request.arrayBuffer();

      if (
        buffer.byteLength === 0 ||
        buffer.byteLength > PART_SIZE
      ) {
        return json({
          success: false,
          error: "Video qismi hajmi noto‘g‘ri."
        }, 413);
      }

      const upload =
        env.VIDEO_BUCKET.resumeMultipartUpload(
          key,
          uploadId
        );

      const part = await upload.uploadPart(
        partNumber,
        buffer
      );

      return json({
        success: true,
        partNumber: part.partNumber,
        etag: part.etag
      });
    }

    // =====================================
    // 3. VIDEONI YAKUNLASH
    // =====================================

    if (action === "complete") {
      const body = await readJSON(request);

      if (!body) {
        return json({
          success: false,
          error: "JSON ma’lumot noto‘g‘ri."
        }, 400);
      }

      if (!await passwordMatches(
        body.password,
        env.ADMIN_PASSWORD
      )) {
        return json({
          success: false,
          error: "Admin paroli noto‘g‘ri."
        }, 401);
      }

      const key = body.key;
      const uploadId = body.uploadId;
      const parts = body.parts;

      if (
        !validKey(key) ||
        !validUploadId(uploadId) ||
        !Array.isArray(parts) ||
        parts.length < 1 ||
        parts.length > MAX_PARTS
      ) {
        return json({
          success: false,
          error: "Yakunlash ma’lumotlari noto‘g‘ri."
        }, 400);
      }

      const normalizedParts = parts.map(part => ({
        partNumber: Number(part.partNumber),
        etag: String(part.etag || "")
      }));

      if (
        normalizedParts.some(part =>
          !Number.isInteger(part.partNumber) ||
          part.partNumber < 1 ||
          part.partNumber > MAX_PARTS ||
          !part.etag
        )
      ) {
        return json({
          success: false,
          error: "Video qismlari noto‘g‘ri."
        }, 400);
      }

      normalizedParts.sort(
        (a, b) => a.partNumber - b.partNumber
      );

      if (
        normalizedParts.some(
          (part, index) =>
            part.partNumber !== index + 1
        )
      ) {
        return json({
          success: false,
          error: "Video qismlari ketma-ket emas."
        }, 400);
      }

      const title = String(
        body.title_uz || ""
      ).trim();

      const thumbnail = String(
        body.thumbnail || ""
      ).trim();

      const aspectRatio = String(
        body.aspect_ratio || "16:9"
      );

      if (
        !title ||
        title.length > 160 ||
        !validThumbnail(thumbnail) ||
        !["9:16", "16:9"].includes(aspectRatio)
      ) {
        return json({
          success: false,
          error: "Video ma’lumotlari noto‘g‘ri."
        }, 400);
      }

      const upload =
        env.VIDEO_BUCKET.resumeMultipartUpload(
          key,
          uploadId
        );

      const object = await upload.complete(
        normalizedParts
      );

      if (object.size > MAX_VIDEO_SIZE) {
        await env.VIDEO_BUCKET.delete(key);

        return json({
          success: false,
          error: "Video 1 GB dan katta."
        }, 413);
      }

      const id = key.split("/")[1].split(".")[0];

      const video = {
        platform: "upload",
        id,
        url: `/api/media/${key}`,
        video_url: `/api/media/${key}`,
        title_uz: title,
        channel: "F1 Uzbekistan TV",
        aspect_ratio: aspectRatio,
        published: new Date().toISOString()
      };

      if (thumbnail) {
        video.thumbnail = thumbnail;
      }

      try {
        await saveToGitHub(env, video);
      } catch (error) {
        console.error("GitHub save error:", error);

        return json({
          success: false,
          error:
            "Video R2 ga yuklandi, ammo GitHub " +
            "ro‘yxatiga yozilmadi. " +
            "Qayta yuklashdan oldin tekshiring."
        }, 502);
      }

      return json({
        success: true,
        message: "Video muvaffaqiyatli yuklandi!",
        video
      });
    }

    // =====================================
    // 4. YUKLASHNI BEKOR QILISH
    // =====================================

    if (action === "abort") {
      const body = await readJSON(request);

      if (!body) {
        return json({
          success: false,
          error: "JSON ma’lumot noto‘g‘ri."
        }, 400);
      }

      if (!await passwordMatches(
        body.password,
        env.ADMIN_PASSWORD
      )) {
        return json({
          success: false,
          error: "Admin paroli noto‘g‘ri."
        }, 401);
      }

      if (
        !validKey(body.key) ||
        !validUploadId(body.uploadId)
      ) {
        return json({
          success: false,
          error: "Yuklash ma’lumotlari noto‘g‘ri."
        }, 400);
      }

      const upload =
        env.VIDEO_BUCKET.resumeMultipartUpload(
          body.key,
          body.uploadId
        );

      await upload.abort();

      return json({
        success: true,
        message: "Yuklash bekor qilindi."
      });
    }

    return json({
      success: false,
      error: "Noma’lum amal."
    }, 400);

  } catch (error) {
    console.error("Multipart error:", error);

    return json({
      success: false,
      error: "Multipart yuklashda server xatoligi."
    }, 500);
  }
}
