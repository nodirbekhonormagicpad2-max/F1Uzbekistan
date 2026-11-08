
"use strict";

const REPO = "nodirbekhonormagicpad2-max/F1Uzbekistan";
const PATH = "uploaded-videos.json";
const API = `https://api.github.com/repos/${REPO}/contents/${PATH}`;

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function checkPassword(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) {
    return false;
  }

  const encoder = new TextEncoder();
  const x = new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(a))
  );
  const y = new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(b))
  );

  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function decode(content) {
  const binary = atob(content.replace(/\s/g, ""));
  return new TextDecoder().decode(
    Uint8Array.from(binary, c => c.charCodeAt(0))
  );
}

function encode(content) {
  const bytes = new TextEncoder().encode(content);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }

  return btoa(binary);
}

function getVideoId(value) {
  try {
    const u = new URL(value);

    if (
      u.protocol !== "https:" ||
      u.hostname !== "drive.google.com"
    ) return null;

    const match = u.pathname.match(
      /^\/file\/d\/([A-Za-z0-9_-]+)\/(?:view|preview)?\/?$/
    );

    if (match) return match[1];

    if (u.pathname === "/open" || u.pathname === "/uc") {
      const id = u.searchParams.get("id");
      return id && /^[A-Za-z0-9_-]+$/.test(id) ? id : null;
    }

    return null;
  } catch {
    return null;
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.GITHUB_TOKEN) {
    return reply({
      success: false,
      error: "Server sozlamalari yetishmaydi."
    }, 503);
  }

  try {
    const data = await request.json();

    if (!await checkPassword(data.password, env.ADMIN_PASSWORD)) {
      return reply({
        success: false,
        error: "Admin paroli noto‘g‘ri."
      }, 401);
    }

    const id = getVideoId(data.url);

    if (!id) {
      return reply({
        success: false,
        error: "Video havolasi noto‘g‘ri."
      }, 400);
    }

    const title = String(data.title_uz || "").trim();

    if (!title || title.length > 160) {
      return reply({
        success: false,
        error: "Video nomini kiriting."
      }, 400);
    }

    const ratio = data.aspect_ratio || "16:9";

    if (!["9:16", "16:9", "1:1"].includes(ratio)) {
      return reply({
        success: false,
        error: "Video formati noto‘g‘ri."
      }, 400);
    }

    const video = {
      platform: "google_drive",
      id: "drive-" + id,
      url: `https://drive.google.com/file/d/${id}/view`,
      video_url: `https://drive.google.com/file/d/${id}/view`,
      title_uz: title,
      channel: "F1 Uzbekistan TV",
      aspect_ratio: ratio,
      published: new Date().toISOString()
    };

    const headers = {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "F1-Cinema-Admin"
    };

    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(API + "?ref=main", {
        headers,
        cache: "no-store"
      });

      let videos = [];
      let sha;

      if (response.ok) {
        const file = await response.json();
        sha = file.sha;
        videos = JSON.parse(decode(file.content));

        if (!Array.isArray(videos)) {
          throw Error("Video ro‘yxati noto‘g‘ri.");
        }
      } else if (response.status !== 404) {
        throw Error("GitHub faylini o‘qib bo‘lmadi.");
      }

      if (videos.some(v =>
        v.id === video.id || getVideoId(v.url) === id
      )) {
        return reply({
          success: false,
          error: "Bu video allaqachon qo‘shilgan."
        }, 409);
      }

      videos.unshift(video);

      const body = {
        message: "F1 CINEMA: yangi video",
        content: encode(JSON.stringify(videos, null, 2) + "\n"),
        branch: "main"
      };

      if (sha) body.sha = sha;

      const saved = await fetch(API, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (saved.ok) {
        return reply({ success: true, video });
      }

      if (saved.status !== 409 && saved.status !== 422) {
        throw Error("Videoni saqlab bo‘lmadi.");
      }
    }

    return reply({
      success: false,
      error: "Qayta urinib ko‘ring."
    }, 409);

  } catch (error) {
    console.error("Video API:", error);

    return reply({
      success: false,
      error: "Serverda xatolik yuz berdi."
    }, 500);
  }
}
