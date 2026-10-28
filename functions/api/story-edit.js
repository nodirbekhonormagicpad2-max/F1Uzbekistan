'use strict';
const REPO = 'nodirbekhonormagicpad2-max/F1Uzbekistan';
const FILE = 'gallery-photos.json';
const BRANCH = 'main';
const URL = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
async function matches(a,b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const encoder = new TextEncoder();
  const [x,y] = await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(a)),crypto.subtle.digest('SHA-256',encoder.encode(b))]);
  const A = new Uint8Array(x), B = new Uint8Array(y);
  let diff = 0;
  for(let i=0;i<A.length;i++) diff |= A[i]^B[i];
  return diff === 0;
}
function decode64(value) {
  const bin = atob(value.replace(/\s/g,''));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}
function encode64(value) {
  const bytes = new TextEncoder().encode(value);
  let out = '';
  for(let i=0;i<bytes.length;i+=8192) out += String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(out);
}
export async function onRequestPost({request,env}) {
  if (!env.ADMIN_PASSWORD || !env.GITHUB_TOKEN) return reply({success:false,error:'Server sozlamalari yetishmaydi.'},503);
  try {
    if (Number(request.headers.get('content-length') || 0) > 100000) return reply({success:false,error:'So‘rov juda katta.'},413);
    const data = await request.json();
    if (!await matches(data?.password,env.ADMIN_PASSWORD)) return reply({success:false,error:'Admin paroli noto‘g‘ri.'},401);
    const id = String(data?.id || '').trim();
    const title = String(data?.title_uz || '').trim();
    const article = String(data?.article_uz || '').trim();
    const source = String(data?.source || '').trim();
    if (!/^[a-f0-9-]{36}$/i.test(id)) return reply({success:false,error:'Surat ID noto‘g‘ri.'},400);
    if (!title || title.length > 160) return reply({success:false,error:'Sarlavha 1–160 belgidan iborat bo‘lsin.'},400);
    if (!article || article.length > 30000) return reply({success:false,error:'Maqola 1–30000 belgidan iborat bo‘lsin.'},400);
    if (source.length > 300) return reply({success:false,error:'Manba 300 belgidan oshmasin.'},400);
    const headers = {Authorization:`Bearer ${env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'F1-Stories-Admin'};
    for (let attempt=0;attempt<3;attempt++) {
      const current = await fetch(URL+'?ref='+BRANCH,{headers,cache:'no-store'});
      if (!current.ok) return reply({success:false,error:'GitHub ro‘yxatini o‘qib bo‘lmadi: HTTP '+current.status},502);
      const file = await current.json();
      const photos = JSON.parse(decode64(file.content));
      if (!Array.isArray(photos)) return reply({success:false,error:'Galereya JSON formati noto‘g‘ri.'},502);
      const photo = photos.find(p => p?.id === id);
      if (!photo) return reply({success:false,error:'Tanlangan surat topilmadi. Ro‘yxatni yangilang.'},404);
      photo.title_uz = title;
      photo.article_uz = article;
      photo.source = source;
      // Surat URL va original published sanasi o‘zgarmaydi.
      const body = {message:`F1 STORIES maqola tahriri: ${id}`,content:encode64(JSON.stringify(photos,null,2)+'\n'),sha:file.sha,branch:BRANCH};
      const saved = await fetch(URL,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});
      if (saved.ok) return reply({success:true,photo});
      if (saved.status !== 409 && saved.status !== 422) return reply({success:false,error:'GitHub saqlash xatosi: HTTP '+saved.status},502);
    }
    return reply({success:false,error:'Bir vaqtda boshqa o‘zgarish kiritildi. Qayta urinib ko‘ring.'},409);
  } catch(error) {
    console.error('F1 STORIES edit error',error);
    return reply({success:false,error:'Serverda xatolik yuz berdi.'},500);
  }
}
