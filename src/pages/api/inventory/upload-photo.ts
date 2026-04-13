import type { APIRoute } from 'astro';
import { AwsClient } from 'aws4fetch';
import { checkAuth } from '../../../lib/auth';
import type { Env } from '../../../lib/r2';

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp',
};

// POST /api/inventory/upload-photo — upload a photo to R2, return { photo_url, photo_key }
export const POST: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  let formData: FormData;
  try {
    formData = await context.request.formData();
  } catch {
    return Response.json({ error: 'Invalid multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'file' field" }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const contentType = file.type || EXT_TO_MIME[ext] || 'application/octet-stream';
  const photo_key = `inventory/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  const env = context.locals.runtime?.env as unknown as Env;

  try {
    const body = await file.arrayBuffer();
    const client = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      service: 's3',
      region: 'auto',
    });
    const endpoint = `${env.R2_ENDPOINT}/${env.R2_BUCKET_NAME}/${photo_key}`;
    const res = await client.fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: body as BodyInit,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`R2 upload failed (${res.status}): ${text}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return Response.json({ error: message }, { status: 502 });
  }

  return Response.json({ photo_url: `/media/${photo_key}`, photo_key });
};

// DELETE /api/inventory/upload-photo — delete a photo from R2 by photo_key
export const DELETE: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  let body: Record<string, unknown>;
  try {
    body = await context.request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const photo_key = body.photo_key as string | undefined;
  if (!photo_key) {
    return Response.json({ error: 'photo_key wajib diisi' }, { status: 400 });
  }

  const env = context.locals.runtime?.env as unknown as Env;
  try {
    const client = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      service: 's3',
      region: 'auto',
    });
    const endpoint = `${env.R2_ENDPOINT}/${env.R2_BUCKET_NAME}/${photo_key}`;
    await client.fetch(endpoint, { method: 'DELETE' });
  } catch {
    // Deletion failure is non-fatal — proceed silently
  }

  return new Response(null, { status: 204 });
};
