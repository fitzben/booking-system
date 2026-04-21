import type { APIRoute } from 'astro';
import type { R2Bucket } from '@cloudflare/workers-types';
import { checkAuth } from '../../../../lib/auth';
import { getDB, getDocumentById } from '../../../../lib/db';

interface RuntimeEnv {
  DB: unknown;
  BUCKET: R2Bucket;
}

// GET /api/admin/documents/:id — stream the file from R2 (auth required)
export const GET: APIRoute = async (context) => {
  const unauth = await checkAuth(context);
  if (unauth) return unauth;

  const id = parseInt(context.params.id ?? '', 10);
  if (isNaN(id)) {
    return Response.json({ error: 'Invalid id' }, { status: 400 });
  }

  const db = getDB(context.locals);
  const doc = await getDocumentById(db, id);
  if (!doc) {
    return Response.json({ error: 'Dokumen tidak ditemukan' }, { status: 404 });
  }

  const env = context.locals.runtime?.env as unknown as RuntimeEnv;
  const object = await env.BUCKET.get(doc.file_key);
  if (!object) {
    return Response.json({ error: 'File tidak ditemukan di storage' }, { status: 404 });
  }

  const ext = doc.file_key.split('.').pop()?.toLowerCase() ?? 'bin';
  const EXT_TO_MIME: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  const contentType = object.httpMetadata?.contentType ?? EXT_TO_MIME[ext] ?? 'application/octet-stream';
  const filename = `${doc.label.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;

  return new Response(object.body as unknown as BodyInit, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
};
