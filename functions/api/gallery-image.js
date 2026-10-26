"use strict";
export async function onRequestGet({request,env}){
  if(!env.VIDEO_BUCKET)return new Response("Storage unavailable",{status:503});
  const name=new URL(request.url).searchParams.get("file")||"";
  if(!/^[a-f0-9-]{36}\.(jpg|png|webp)$/i.test(name))return new Response("Not found",{status:404});
  const object=await env.VIDEO_BUCKET.get(`gallery/${name}`);
  if(!object)return new Response("Not found",{status:404});
  const headers=new Headers();object.writeHttpMetadata(headers);headers.set("Cache-Control","public, max-age=31536000, immutable");headers.set("X-Content-Type-Options","nosniff");return new Response(object.body,{headers});
}

