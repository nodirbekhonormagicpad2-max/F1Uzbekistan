"use strict";

function errorResponse(message, status = 404) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function onRequestGet(context) {
  const { request, env, params } = context;

  if (!env.VIDEO_BUCKET) {
    return errorResponse(
      "VIDEO_BUCKET sozlanmagan.",
      503
    );
  }

  // Masalan: /api/media/videos/abc123.mp4
  const path = params.path;

  const key = Array.isArray(path)
    ? path.join("/")
    : String(path || "");

  // Faqat videos/ papkasidagi MP4 va WebM fayllar.
  if (
    !/^videos\/[a-f0-9-]{36}\.(mp4|webm)$/i.test(key)
  ) {
    return errorResponse(
      "Video manzili noto‘g‘ri.",
      400
    );
  }

  try {
    const rangeHeader = request.headers.get("Range");

    let object;

    if (rangeHeader) {
      // Video ichida oldinga-orqaga surish uchun.
      object = await env.VIDEO_BUCKET.get(key, {
        range: request.headers
      });
    } else {
      object = await env.VIDEO_BUCKET.get(key);
    }

    if (!object) {
      return errorResponse(
        "Video topilmadi.",
        404
      );
    }

    const headers = new Headers();

    const contentType = key.endsWith(".webm")
      ? "video/webm"
      : "video/mp4";

    headers.set("Content-Type", contentType);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("X-Content-Type-Options", "nosniff");

    const totalSize = object.size;

    // R2 qaytargan real diapazon.
    const range = object.range;

    if (
      rangeHeader &&
      range &&
      typeof range.offset === "number" &&
      typeof range.length === "number"
    ) {
      const start = range.offset;
      const end = start + range.length - 1;

      headers.set(
        "Content-Range",
        `bytes ${start}-${end}/${totalSize}`
      );

      headers.set(
        "Content-Length",
        String(range.length)
      );

      return new Response(object.body, {
        status: 206,
        headers
      });
    }

    headers.set(
      "Content-Length",
      String(totalSize)
    );

    return new Response(object.body, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error("R2 media error:", error);

    return errorResponse(
      "Videoni ochishda xatolik yuz berdi.",
      500
    );
  }
}

export async function onRequestHead(context) {
  const response = await onRequestGet(context);

  return new Response(null, {
    status: response.status,
    headers: response.headers
  });
}
