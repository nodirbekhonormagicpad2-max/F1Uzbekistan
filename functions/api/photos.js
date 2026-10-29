"use strict";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_ARTICLE_LENGTH = 30000;
const MAX_SOURCE_LENGTH = 300;

const MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const REPO = "nodirbekhonormagicpad2-max/F1Uzbekistan";
const FILE = "gallery-photos.json";
const BRANCH = "main";

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

async function matches(a, b) {
  if (
    typeof a !== "string" ||
    typeof b !== "string" ||
    !a ||
    !b
  ) {
    return false;
  }

  const encoder = new TextEncoder();

  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b))
  ]);

  const A = new Uint8Array(hashA);
  const B = new Uint8Array(hashB);

  let difference = 0;

  for (let i = 0; i < A.length; i++) {
    difference |= A[i] ^ B[i];
  }

  return difference === 0;
}

function b64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + 8192)
    );
  }

  return btoa(binary);
}

function unb64(text) {
  const binary = atob(text.replace(/\s/g, ""));

  return new TextDecoder().decode(
    Uint8Array.from(binary, char => char.charCodeAt(0))
  );
}

function validImage(bytes, type) {
  if (type === "image/jpeg") {
    return (
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255
    );
  }

  if (type === "image/png") {
    return (
      bytes[0] === 137 &&
      bytes[1] === 80 &&
      bytes[2] === 78 &&
      bytes[3] === 71 &&
      bytes[4] === 13 &&
      bytes[5] === 10 &&
      bytes[6] === 26 &&
      bytes[7] === 10
    );
  }

  if (type === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

/* GITHUB'DAGI GALEREYA RO'YXATINI YANGILASH */

async function saveToGitHub(env, photo) {
  const url =
    `https://api.github.com/repos/${REPO}/contents/${FILE}`;

  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "F1-Stories-Admin"
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(
      url + "?ref=" + BRANCH,
      {
        headers,
        cache: "no-store"
      }
    );

    let items = [];
    let sha;

    if (response.ok) {
      const file = await response.json();

      sha = file.sha;

      const parsed = JSON.parse(
        unb64(file.content)
      );

      if (!Array.isArray(parsed)) {
        throw new Error(
          "gallery-photos.json formati noto‘g‘ri."
        );
      }

      items = parsed;
    } else if (response.status !== 404) {
      throw new Error(
        "GitHub faylini o‘qib bo‘lmadi: " +
        response.status
      );
    }

    // Bir xil ID qayta qo‘shilmasin.
    if (items.some(item => item.id === photo.id)) {
      return;
    }

    // Yangi post ro‘yxat boshiga qo‘shiladi.
    items.unshift(photo);

    const body = {
      message: `F1 STORIES: ${photo.title_uz}`,
      content: b64(
        JSON.stringify(items, null, 2) + "\n"
      ),
      branch: BRANCH
    };

    if (sha) {
      body.sha = sha;
    }

    const result = await fetch(url, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (result.ok) {
      return;
    }

    if (
      result.status !== 409 &&
      result.status !== 422
    ) {
      throw new Error(
        "GitHub saqlash xatoligi: " +
        result.status
      );
    }
  }

  throw new Error(
    "GitHub fayli bir vaqtda o‘zgartirilmoqda."
  );
}

/* ADMIN PANELDAN F1 STORIES POST QABUL QILISH */

export async function onRequestPost({ request, env }) {
  if (
    !env.ADMIN_PASSWORD ||
    !env.GITHUB_TOKEN ||
    !env.VIDEO_BUCKET
  ) {
    return json({
      success: false,
      error: "Server sozlamalari yetishmaydi."
    }, 503);
  }

  try {
    const length = Number(
      request.headers.get("Content-Length") || 0
    );

    if (length > MAX_IMAGE_SIZE + 1024 * 1024) {
      return json({
        success: false,
        error: "Surat hajmi 10 MB dan oshmasin."
      }, 413);
    }

    const form = await request.formData();

    /* ADMIN PAROLI */

    const password = form.get("password");

    if (
      !await matches(password, env.ADMIN_PASSWORD)
    ) {
      return json({
        success: false,
        error: "Admin paroli noto‘g‘ri."
      }, 401);
    }

    /* POST MA'LUMOTLARI */

    const title = String(
      form.get("title_uz") || ""
    ).trim();

    // Maqola bo‘sh bo‘lishi mumkin.
    const article = String(
      form.get("article_uz") || ""
    ).trim();

    // Manba ham ixtiyoriy.
    const source = String(
      form.get("source") || ""
    ).trim();

    const image = form.get("image");

    /* TEKSHIRISHLAR */

    // Sarlavha majburiy.
    if (!title || title.length > 160) {
      return json({
        success: false,
        error: "Sarlavha 1–160 belgidan iborat bo‘lsin."
      }, 400);
    }

    // O‘ZGARISH: maqola majburiy emas.
    // Faqat maksimal uzunlik tekshiriladi.
    if (article.length > MAX_ARTICLE_LENGTH) {
      return json({
        success: false,
        error: "Maqola 30000 belgidan oshmasin."
      }, 400);
    }

    if (source.length > MAX_SOURCE_LENGTH) {
      return json({
        success: false,
        error: "Manba 300 belgidan oshmasin."
      }, 400);
    }

    // Rasm majburiy.
    if (
      !image ||
      typeof image.arrayBuffer !== "function" ||
      !MIME[image.type] ||
      image.size < 12 ||
      image.size > MAX_IMAGE_SIZE
    ) {
      return json({
        success: false,
        error:
          "Faqat JPG, PNG yoki WebP surat yuklang. " +
          "Maksimal 10 MB."
      }, 400);
    }

    /* SURATNI TEKSHIRISH */

    const bytes = new Uint8Array(
      await image.arrayBuffer()
    );

    if (!validImage(bytes, image.type)) {
      return json({
        success: false,
        error: "Rasm fayli haqiqiy emas."
      }, 400);
    }

    /* YANGI POST ID */

    const id = crypto.randomUUID();

    const extension = MIME[image.type];

    const key = `gallery/${id}.${extension}`;

    /* SURATNI R2 GA SAQLASH */

    await env.VIDEO_BUCKET.put(key, bytes, {
      httpMetadata: {
        contentType: image.type,
        cacheControl:
          "public, max-age=31536000, immutable"
      }
    });

    /* F1 STORIES POSTI */

    const photo = {
      id,
      url:
        `/api/gallery-image?file=${id}.${extension}`,
      title_uz: title,

      // Maqola kiritilmagan bo‘lsa, bo‘sh satr saqlanadi.
      article_uz: article,

      source: source,
      published: new Date().toISOString()
    };

    /* GITHUB JSON FAYLIGA SAQLASH */

    try {
      await saveToGitHub(env, photo);
    } catch (error) {
      console.error(
        "F1 STORIES GitHub xatosi:",
        error
      );

      return json({
        success: false,
        error:
          "Surat R2 ga yuklandi, ammo post " +
          "GitHub ro‘yxatiga saqlanmadi. " +
          "Qayta yuborishdan oldin tekshiring."
      }, 502);
    }

    /* MUVAFFAQIYATLI JAVOB */

    return json({
      success: true,
      message:
        "F1 STORIES posti muvaffaqiyatli saqlandi.",
      photo
    });

  } catch (error) {
    console.error(
      "F1 STORIES server xatosi:",
      error
    );

    return json({
      success: false,
      error:
        "Postni saqlashda server xatoligi yuz berdi."
    }, 500);
  }
}
