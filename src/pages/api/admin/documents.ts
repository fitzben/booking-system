import type { APIRoute } from 'astro';
import type { R2Bucket } from '@cloudflare/workers-types';
import { checkAuth } from '../../../lib/auth';
import { getDB, createDocument, getDocumentById, deleteDocument, getDocumentsByBookingId } from '../../../lib/db';

// ── Type for the runtime env that has both DB and R2 bindings ────────────────

interface RuntimeEnv {
  DB: unknown;
  BUCKET: R2Bucket;
  R2_PUBLIC_URL?: string;
}

function getEnv(locals: App.Locals): RuntimeEnv {
  return locals.runtime?.env as unknown as RuntimeEnv;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// ── GET: list documents for a booking ────────────────────────────────────────

export const GET: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  const rawId = context.url.searchParams.get('booking_id');
  const bookingId = rawId ? parseInt(rawId, 10) : NaN;
  if (isNaN(bookingId)) {
    return Response.json({ error: 'booking_id wajib diisi' }, { status: 400 });
  }

  const db = getDB(context.locals);
  const docs = await getDocumentsByBookingId(db, bookingId);
  return Response.json(docs);
};

// ── POST: upload a document for a booking ────────────────────────────────────

export const POST: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  let formData: FormData;
  try {
    formData = await context.request.formData();
  } catch {
    return Response.json({ error: 'Invalid multipart/form-data' }, { status: 400 });
  }

  const rawBookingId = formData.get('booking_id');
  const label = (formData.get('label') as string | null)?.trim();
  const file = formData.get('file');

  if (!rawBookingId || isNaN(Number(rawBookingId))) {
    return Response.json({ error: 'booking_id wajib diisi' }, { status: 400 });
  }
  if (!label) {
    return Response.json({ error: 'label wajib diisi' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'file' field" }, { status: 400 });
  }

  const bookingId = Number(rawBookingId);
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const contentType = file.type || EXT_TO_MIME[ext] || 'application/octet-stream';
  const key = `booking-documents/${bookingId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  const env = getEnv(context.locals);
  const body = await file.arrayBuffer();

  try {
    await env.BUCKET.put(key, body, { httpMetadata: { contentType } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'R2 upload failed';
    return Response.json({ error: message }, { status: 502 });
  }

  const publicBase = (env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
  const file_url = publicBase ? `${publicBase}/${key}` : `/media/${key}`;

  const db = getDB(context.locals);
  let docId: number;
  try {
    docId = await createDocument(db, { booking_id: bookingId, label, file_key: key, file_url });
  } catch (err) {
    // Rollback R2 object on DB failure
    await env.BUCKET.delete(key).catch(() => undefined);
    const message = err instanceof Error ? err.message : 'DB insert failed';
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({
    id: docId,
    booking_id: bookingId,
    label,
    file_key: key,
    file_url,
    uploaded_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  }, { status: 201 });
};

// ── DELETE: remove a document by id ──────────────────────────────────────────

export const DELETE: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  let body: Record<string, unknown>;
  try {
    body = await context.request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = typeof body.id === 'number' ? body.id : parseInt(String(body.id ?? ''), 10);
  if (isNaN(id)) {
    return Response.json({ error: 'id wajib diisi' }, { status: 400 });
  }

  const db = getDB(context.locals);
  const doc = await getDocumentById(db, id);
  if (!doc) {
    return Response.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 });
  }

  const env = getEnv(context.locals);
  await env.BUCKET.delete(doc.file_key).catch(() => undefined);
  await deleteDocument(db, id);

  return new Response(null, { status: 204 });
};
