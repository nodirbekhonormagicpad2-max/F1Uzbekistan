"use strict";

const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;
const PART_SIZE = 10 * 1024 * 1024;
const MAX_PARTS = 100;

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
  const binary = atob(
    base64.replace(/\s/g, "")
  );

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
    // Birinchi video: yangi JSON fayl yaratiladi.
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

  // Bir xil videoni takroran qo‘shmaymiz.
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

  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      success: false,
      error: "JSON ma’lumot noto‘g‘ri."
    }, 400);
  }

  const authorized = await passwordMatches(
    body.password,
    env.ADMIN_PASSWORD
  );

  if (!authorized) {
    return json({
      success: false,
      error: "Admin paroli noto‘g‘ri."
    }, 401);
  }

  const action = String(body.action || "");

  try {
    // 1. Multipart yuklashni boshlash
    if (action === "init") {
      const extension = String(
        body.extension || ""
      ).toLowerCase();

      const size = Number(body.size);

      if (!ALLOWED_TYPES[extension]) {
        return json({
          success: false,
          error: "Faqat MP4 va WebM qo‘llab-quvvatlanadi."
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
          error: "Muqova rasmi havolasi noto‘g‘ri."
        }, 400);
      }

      const aspectRatio = String(
        body.aspect_ratio || "16:9"
      );

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

    // 2. Bitta video qismini yuklash
    if (action === "part") {
      const key = body.key;
      const uploadId = body.uploadId;
      const partNumber = Number(body.partNumber);

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

      if (
        typeof body.data !== "string" ||
        !body.data
      ) {
        return json({
          success: false,
          error: "Video qismi yuborilmagan."
        }, 400);
      }

      // Base64 ko‘rinishidagi qismni tiklash.
      const binary = atob(body.data);

      if (
        binary.length === 0 ||
        binary.length > PART_SIZE
      ) {
        return json({
          success: false,
          error: "Video qismi hajmi noto‘g‘ri."
        }, 413);
      }

      const bytes = Uint8Array.from(
        binary,
        char => char.charCodeAt(0)
      );

      const upload =
        env.VIDEO_BUCKET.resumeMultipartUpload(
          key,
          uploadId
        );

      const part = await upload.uploadPart(
        partNumber,
        bytes
      );

      return json({
        success: true,
        partNumber: part.partNumber,
        etag: part.etag
      });
    }

    // 3. Barcha qismlarni birlashtirish
    if (action === "complete") {
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

      await upload.complete(normalizedParts);

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
            "Video R2’ga yuklandi, lekin GitHub " +
            "ro‘yxatiga yozilmadi. Qayta " +
            "yuklashdan oldin tekshiring."
        }, 502);
      }

      return json({
        success: true,
        message: "Katta video muvaffaqiyatli yuklandi!",
        video
      });
    }

    // 4. Tugallanmagan yuklashni bekor qilish
    if (action === "abort") {
      const key = body.key;
      const uploadId = body.uploadId;

      if (
        !validKey(key) ||
        !validUploadId(uploadId)
      ) {
        return json({
          success: false,
          error: "Yuklash ma’lumotlari noto‘g‘ri."
        }, 400);
      }

      const upload =
        env.VIDEO_BUCKET.resumeMultipartUpload(
          key,
          uploadId
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
